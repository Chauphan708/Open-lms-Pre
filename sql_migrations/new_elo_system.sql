-- ============================================================
-- Migration: Hệ thống Elo mới
-- Ngày: 2026-07-02
-- Mô tả:
--   1. Đổi default elo_rating từ 1000 → 0
--   2. Cập nhật GREATEST(500,...) → GREATEST(0,...) trong RPC functions
--   3. Tính lại toàn bộ Elo cho học sinh hiện tại theo công thức mới
--
-- CÁCH CHẠY: Copy toàn bộ nội dung file này vào Supabase SQL Editor và chạy.
-- ============================================================

-- ============================================================
-- PHẦN 1: Đổi default elo_rating về 0
-- ============================================================
ALTER TABLE public.arena_profiles 
  ALTER COLUMN elo_rating SET DEFAULT 0;

-- ============================================================
-- PHẦN 2: Cập nhật hàm update_arena_profile_stats_rpc
-- Thay GREATEST(500,...) → GREATEST(0,...)
-- ============================================================
CREATE OR REPLACE FUNCTION update_arena_profile_stats_rpc(
    p_user_id TEXT,
    p_xp_gained INT,
    p_elo_change INT,
    p_new_floor INT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Xác thực người dùng
    IF auth.uid()::text <> p_user_id THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Kiểm tra giới hạn tránh tấn công cheat điểm số cực đoan
    IF p_xp_gained < 0 OR p_xp_gained > 100 THEN
        RAISE EXCEPTION 'Invalid XP amount';
    END IF;

    IF p_elo_change < -50 OR p_elo_change > 50 THEN
        RAISE EXCEPTION 'Invalid ELO change';
    END IF;

    UPDATE public.arena_profiles
    SET
        total_xp = total_xp + p_xp_gained,
        elo_rating = GREATEST(0, elo_rating + p_elo_change),
        tower_floor = COALESCE(p_new_floor, tower_floor)
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PHẦN 3: Cập nhật hàm finish_arena_match_rpc (PvP)
-- Thêm GREATEST(0,...) để Elo không bao giờ âm
-- ============================================================
CREATE OR REPLACE FUNCTION finish_arena_match_rpc(
    p_match_id UUID,
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
    -- 1. Lấy thông tin trận đấu và kiểm tra trạng thái
    SELECT status, player1_id, player2_id 
    INTO v_status, v_player1_id, v_player2_id
    FROM public.arena_matches
    WHERE id = p_match_id;
    
    IF v_status IS NULL OR v_status = 'finished' THEN
        RETURN;
    END IF;
    
    -- 2. Cập nhật trạng thái trận đấu
    UPDATE public.arena_matches
    SET 
        status = 'finished',
        winner_id = p_winner_id
    WHERE id = p_match_id;
    
    -- 3. Lấy thông tin profile hai người chơi
    SELECT elo_rating, total_xp, wins, losses 
    INTO v_p1_elo, v_p1_xp, v_p1_wins, v_p1_losses
    FROM public.arena_profiles WHERE id = v_player1_id;
    
    SELECT elo_rating, total_xp, wins, losses 
    INTO v_p2_elo, v_p2_xp, v_p2_wins, v_p2_losses
    FROM public.arena_profiles WHERE id = v_player2_id;
    
    IF v_p1_elo IS NULL OR v_p2_elo IS NULL THEN
        RETURN;
    END IF;
    
    -- 4. Tính toán kỳ vọng Elo
    v_expected1 := 1.0 / (1.0 + power(10.0, (v_p2_elo - v_p1_elo)::double precision / 400.0));
    v_expected2 := 1.0 - v_expected1;
    
    -- 5. Xác định điểm số thực tế
    IF p_winner_id = v_player1_id THEN
        v_score1 := 1.0;
        v_score2 := 0.0;
    ELSIF p_winner_id = v_player2_id THEN
        v_score1 := 0.0;
        v_score2 := 1.0;
    END IF;
    
    -- 6. Tính toán Elo mới (GREATEST(0,...) để không bao giờ âm)
    v_new_elo1 := GREATEST(0, round(v_p1_elo + v_k * (v_score1 - v_expected1)));
    v_new_elo2 := GREATEST(0, round(v_p2_elo + v_k * (v_score2 - v_expected2)));
    
    -- 7. Cập nhật profiles
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

-- ============================================================
-- PHẦN 4: Tính lại toàn bộ Elo cho học sinh hiện tại
-- Logic:
--   a. Elo từ Mastery Milestones: 30%→+1, 50%→+2, 70%→+3, 80%→+4, 90%→+5, 100%→+15
--   b. Elo từ Tower Attempts: ước tính +1 cho mỗi 5 câu đúng, -1 cho mỗi 2 câu sai
--   c. Elo từ PvP: ước tính thắng +3, thua -2
-- ============================================================
DO $$
DECLARE
    r RECORD;
    v_new_elo INT;
    v_mastery_elo INT;
    v_tower_elo INT;
    v_pvp_elo INT;
    v_key TEXT;
    v_val INT;
    v_topic_mastery JSONB;
    v_pvp_wins INT;
    v_pvp_losses INT;
BEGIN
    FOR r IN SELECT id, elo_rating, topic_mastery, wins, losses FROM public.arena_profiles LOOP
        -- ========================================
        -- A. Elo từ Mastery Milestones
        -- ========================================
        v_mastery_elo := 0;
        v_topic_mastery := r.topic_mastery;
        IF v_topic_mastery IS NOT NULL AND jsonb_typeof(v_topic_mastery) = 'object' THEN
            FOR v_key IN SELECT jsonb_object_keys(v_topic_mastery) LOOP
                v_val := COALESCE((v_topic_mastery->>v_key)::int, 0);
                IF v_val >= 100 THEN
                    v_mastery_elo := v_mastery_elo + 15;
                ELSIF v_val >= 90 THEN
                    v_mastery_elo := v_mastery_elo + 5;
                ELSIF v_val >= 80 THEN
                    v_mastery_elo := v_mastery_elo + 4;
                ELSIF v_val >= 70 THEN
                    v_mastery_elo := v_mastery_elo + 3;
                ELSIF v_val >= 50 THEN
                    v_mastery_elo := v_mastery_elo + 2;
                ELSIF v_val >= 30 THEN
                    v_mastery_elo := v_mastery_elo + 1;
                END IF;
            END LOOP;
        END IF;

        -- ========================================
        -- B. Elo từ Tower Attempts (ước tính)
        -- Mỗi 5 câu đúng → +1 Elo, mỗi 2 câu sai → -1 Elo
        -- ========================================
        SELECT COALESCE(
            SUM(
                GREATEST(0, 
                    (correct_answers / 5) - ((total_questions - correct_answers) / 2)
                )
            ), 0)
        INTO v_tower_elo
        FROM public.arena_tower_attempts
        WHERE student_id = r.id;

        -- ========================================
        -- C. Elo từ PvP (ước tính)
        -- Thắng → +3 Elo, Thua → -2 Elo
        -- ========================================
        SELECT 
            COALESCE(SUM(CASE WHEN winner_id = r.id THEN 1 ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN (player1_id = r.id OR player2_id = r.id) AND winner_id IS NOT NULL AND winner_id <> r.id THEN 1 ELSE 0 END), 0)
        INTO v_pvp_wins, v_pvp_losses
        FROM public.arena_matches
        WHERE (player1_id = r.id OR player2_id = r.id) AND status = 'finished';

        v_pvp_elo := (v_pvp_wins * 3) - (v_pvp_losses * 2);

        -- ========================================
        -- D. Tính tổng Elo mới (không bao giờ âm)
        -- ========================================
        v_new_elo := GREATEST(0, v_mastery_elo + v_tower_elo + v_pvp_elo);

        -- ========================================
        -- E. Cập nhật profile
        -- ========================================
        UPDATE public.arena_profiles
        SET elo_rating = v_new_elo
        WHERE id = r.id;
        
        RAISE NOTICE 'Profile % : mastery=% tower=% pvp=% → new_elo=%', 
            r.id, v_mastery_elo, v_tower_elo, v_pvp_elo, v_new_elo;
    END LOOP;
END $$;
