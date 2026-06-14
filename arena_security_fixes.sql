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

-- 2. Hàm kết thúc trận đấu và cập nhật Elo (Server-side) - Phác thảo
CREATE OR REPLACE FUNCTION finish_arena_match_rpc(
    p_match_id TEXT,
    p_winner_id TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE arena_matches
    SET 
        status = 'finished',
        winner_id = p_winner_id
    WHERE id = p_match_id
    AND status = 'playing';
END;
$$ LANGUAGE plpgsql;
