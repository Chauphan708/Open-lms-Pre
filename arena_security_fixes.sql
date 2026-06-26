-- =================================================================================
-- FIX RACE CONDITION & ATOMIC HP UPDATES FOR ARENA
-- Chạy script này trong Supabase SQL Editor để kích hoạt hàm RPC.
-- =================================================================================

-- 1. Hàm trừ máu đối thủ một cách an toàn (Atomic)
CREATE OR REPLACE FUNCTION apply_arena_damage(
    p_match_id TEXT,
    p_target_player_id TEXT,
    p_damage_amount INT
)
RETURNS VOID AS $$
BEGIN
    -- Kiểm tra xem p_target_player_id là Player1 hay Player2 trong trận đấu
    UPDATE arena_matches
    SET 
        player1_hp = CASE WHEN player1_id = p_target_player_id THEN GREATEST(0, player1_hp - p_damage_amount) ELSE player1_hp END,
        player2_hp = CASE WHEN player2_id = p_target_player_id THEN GREATEST(0, player2_hp - p_damage_amount) ELSE player2_hp END
    WHERE id = p_match_id 
    AND status = 'playing';
END;
$$ LANGUAGE plpgsql;

-- 2. Hàm kết thúc trận đấu, tính toán Elo và cập nhật Profiles (Server-side)
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
    
    -- 6. Tính toán Elo mới
    v_new_elo1 := round(v_p1_elo + v_k * (v_score1 - v_expected1));
    v_new_elo2 := round(v_p2_elo + v_k * (v_score2 - v_expected2));
    
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

-- 3. Hàm cập nhật điểm số Tower Mode an toàn có kiểm tra giới hạn (Sanity Checks)
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
        elo_rating = GREATEST(500, elo_rating + p_elo_change),
        tower_floor = COALESCE(p_new_floor, tower_floor)
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
