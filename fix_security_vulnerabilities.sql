-- =================================================================================
-- SQL MIGRATION: VÁ LỖ HỔNG BẢO MẬT HỆ THỐNG & TỐI ƯU HÓA RLS
-- Chạy script này trong Supabase SQL Editor để thắt chặt bảo mật cơ sở dữ liệu.
-- =================================================================================

-- ==========================================
-- 1. VÁ LỖ HỔNG SEC-01: BẢNG arena_profiles
-- ==========================================
-- Hủy bỏ chính sách cũ cho phép sửa đổi ELO/XP trực tiếp từ client
DROP POLICY IF EXISTS "User update own profile" ON public.arena_profiles;

-- Thêm chính sách mới: Chỉ cho phép đọc, không cho phép ghi/sửa trực tiếp
CREATE POLICY "Users can only read arena profiles"
  ON public.arena_profiles FOR SELECT
  TO authenticated
  USING (true);

-- ==========================================
-- 2. VÁ LỖ HỔNG SEC-02: BẢNG arena_inventory
-- ==========================================
-- Hủy các chính sách cho phép tự ý chèn/sửa kho đồ trực tiếp
DROP POLICY IF EXISTS "Students can insert own inventory" ON public.arena_inventory;
DROP POLICY IF EXISTS "Students can update own inventory" ON public.arena_inventory;
DROP POLICY IF EXISTS "Students can delete own inventory" ON public.arena_inventory;

-- Chỉ cho phép đọc kho đồ của chính mình (hoặc giáo viên đọc toàn bộ)
DROP POLICY IF EXISTS "Anyone authenticated can view inventory" ON public.arena_inventory;
CREATE POLICY "Users read own inventory"
  ON public.arena_inventory FOR SELECT
  TO authenticated
  USING (
    auth.uid()::text = student_id 
    OR (SELECT role FROM public.profiles WHERE id::text = auth.uid()::text) IN ('ADMIN', 'TEACHER')
  );

-- Lưu ý: Quyền ghi/sửa được thực thi thông qua RPC chạy dưới quyền SECURITY DEFINER (buy_arena_item & use_arena_item)

-- ==========================================
-- 3. VÁ LỖ HỔNG SEC-03: CÀI ĐẶT HỆ THỐNG & DIỄN ĐÀN (DISCUSSION)
-- ==========================================

-- A. Bảng system_settings (Cài đặt hệ thống)
DROP POLICY IF EXISTS "Allow all updates for now" ON public.system_settings;
DROP POLICY IF EXISTS "Public read access" ON public.system_settings;
DROP POLICY IF EXISTS "Anyone can read system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Anyone can read non-secret system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admin/Teacher can read secret system settings" ON public.system_settings;

CREATE POLICY "Anyone can read non-secret system settings"
  ON public.system_settings FOR SELECT
  USING (key <> 'gemini_api_key');

CREATE POLICY "Admin/Teacher can read secret system settings"
  ON public.system_settings FOR SELECT
  TO authenticated
  USING (
    key = 'gemini_api_key'
    AND (SELECT role FROM public.profiles WHERE id::text = auth.uid()::text) IN ('ADMIN', 'TEACHER')
  );

CREATE POLICY "Admin/Teacher only manage system settings"
  ON public.system_settings FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id::text = auth.uid()::text) IN ('ADMIN', 'TEACHER')
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id::text = auth.uid()::text) IN ('ADMIN', 'TEACHER')
  );

-- B. Bảng discussion_sessions (Phòng thảo luận)
DROP POLICY IF EXISTS "Public access" ON public.discussion_sessions;
CREATE POLICY "Authenticated read sessions"
  ON public.discussion_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers and admins manage sessions"
  ON public.discussion_sessions FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id::text = auth.uid()::text) IN ('ADMIN', 'TEACHER')
  );

-- C. Bảng discussion_messages (Tin nhắn thảo luận)
DROP POLICY IF EXISTS "Public access" ON public.discussion_messages;
CREATE POLICY "Authenticated read messages"
  ON public.discussion_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users create own messages"
  ON public.discussion_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = sender_id);

CREATE POLICY "Sender or teacher delete messages"
  ON public.discussion_messages FOR DELETE
  TO authenticated
  USING (
    auth.uid()::text = sender_id 
    OR (SELECT role FROM public.profiles WHERE id::text = auth.uid()::text) IN ('ADMIN', 'TEACHER')
  );

-- ==========================================
-- 4. VÁ LỖ HỔNG SEC-04: XÁC THỰC TRONG HÀM RPC TRẬN ĐẤU
-- ==========================================

-- Hàm trừ máu đối thủ an toàn (Yêu cầu caller phải là 1 trong 2 người chơi)
CREATE OR REPLACE FUNCTION apply_arena_damage(
    p_match_id TEXT,
    p_target_player_id TEXT,
    p_damage_amount INT
)
RETURNS VOID AS $$
DECLARE
    v_player1_id TEXT;
    v_player2_id TEXT;
BEGIN
    -- Lấy thông tin hai người chơi của trận đấu
    SELECT player1_id, player2_id 
    INTO v_player1_id, v_player2_id
    FROM public.arena_matches
    WHERE id = p_match_id;

    -- Kiểm tra xem người gọi hàm có phải là người tham gia không
    IF auth.uid()::text <> v_player1_id AND auth.uid()::text <> v_player2_id THEN
        RAISE EXCEPTION 'Bạn không tham gia trận đấu này!';
    END IF;

    -- Chỉ cập nhật HP nếu trận đấu đang diễn ra
    UPDATE arena_matches
    SET 
        player1_hp = CASE WHEN player1_id = p_target_player_id THEN GREATEST(0, player1_hp - p_damage_amount) ELSE player1_hp END,
        player2_hp = CASE WHEN player2_id = p_target_player_id THEN GREATEST(0, player2_hp - p_damage_amount) ELSE player2_hp END
    WHERE id = p_match_id 
    AND status = 'playing';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Hàm kết thúc trận đấu (Yêu cầu caller phải là 1 trong 2 người chơi)
CREATE OR REPLACE FUNCTION finish_arena_match_rpc(
    p_match_id TEXT,
    p_winner_id TEXT
)
RETURNS VOID AS $$
DECLARE
    v_player1_id TEXT;
    v_player2_id TEXT;
    v_p1_elo INT;
    v_p2_elo INT;
    v_p1_xp INT;
    v_p2_xp INT;
    v_p1_wins INT;
    v_p2_wins INT;
    v_p1_losses INT;
    v_p2_losses INT;
    
    v_expected1 DOUBLE PRECISION;
    v_expected2 DOUBLE PRECISION;
    v_score1 DOUBLE PRECISION := 0.5;
    v_score2 DOUBLE PRECISION := 0.5;
    
    v_new_elo1 INT;
    v_new_elo2 INT;
    v_k CONSTANT INT := 32;
    v_status TEXT;
BEGIN
    -- Lấy thông tin trận đấu
    SELECT status, player1_id, player2_id 
    INTO v_status, v_player1_id, v_player2_id
    FROM public.arena_matches
    WHERE id = p_match_id;
    
    IF v_status IS NULL OR v_status = 'finished' THEN
        RETURN;
    END IF;

    -- Kiểm tra quyền: Người gọi phải là người chơi trong trận đấu
    IF auth.uid()::text <> v_player1_id AND auth.uid()::text <> v_player2_id THEN
        RAISE EXCEPTION 'Bạn không tham gia trận đấu này!';
    END IF;
    
    -- Cập nhật trạng thái trận đấu
    UPDATE public.arena_matches
    SET 
        status = 'finished',
        winner_id = p_winner_id
    WHERE id = p_match_id;
    
    -- Lấy thông tin profile hai người chơi
    SELECT elo_rating, total_xp, wins, losses 
    INTO v_p1_elo, v_p1_xp, v_p1_wins, v_p1_losses
    FROM public.arena_profiles WHERE id = v_player1_id;
    
    SELECT elo_rating, total_xp, wins, losses 
    INTO v_p2_elo, v_p2_xp, v_p2_wins, v_p2_losses
    FROM public.arena_profiles WHERE id = v_player2_id;
    
    IF v_p1_elo IS NULL OR v_p2_elo IS NULL THEN
        RETURN;
    END IF;
    
    -- Tính toán kỳ vọng Elo
    v_expected1 := 1.0 / (1.0 + power(10.0, (v_p2_elo - v_p1_elo)::double precision / 400.0));
    v_expected2 := 1.0 - v_expected1;
    
    -- Xác định điểm số thực tế
    IF p_winner_id = v_player1_id THEN
        v_score1 := 1.0;
        v_score2 := 0.0;
    ELSIF p_winner_id = v_player2_id THEN
        v_score1 := 0.0;
        v_score2 := 1.0;
    END IF;
    
    -- Tính toán Elo mới
    v_new_elo1 := round(v_p1_elo + v_k * (v_score1 - v_expected1));
    v_new_elo2 := round(v_p2_elo + v_k * (v_score2 - v_expected2));
    
    -- Cập nhật profiles
    UPDATE public.arena_profiles
    SET
        elo_rating = v_new_elo1,
        total_xp = v_p1_xp + CASE WHEN v_score1 = 1.0 THEN 50 ELSE 10 END,
        wins = v_p1_wins + CASE WHEN v_score1 = 1.0 THEN 1 ELSE 0 END,
        losses = v_p1_losses + CASE WHEN v_score1 = 0.0 THEN 1 ELSE 0 END
    WHERE id = v_player1_id;
    
    UPDATE public.arena_profiles
    SET
        elo_rating = v_new_elo2,
        total_xp = v_p2_xp + CASE WHEN v_score2 = 1.0 THEN 50 ELSE 10 END,
        wins = v_p2_wins + CASE WHEN v_score2 = 1.0 THEN 1 ELSE 0 END,
        losses = v_p2_losses + CASE WHEN v_score2 = 0.0 THEN 1 ELSE 0 END
    WHERE id = v_player2_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
