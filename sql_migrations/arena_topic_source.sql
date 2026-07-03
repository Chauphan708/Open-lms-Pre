-- ============================================================
-- Migration: Tách biệt chủ đề Arena (A) và Ngân hàng đề (E)
-- Ngày: 2026-07-03
-- Mô tả:
--   Thêm cột `source` vào bảng arena_topics để phân biệt
--   chủ đề gốc Arena ('arena') và chủ đề từ Ngân hàng đề ('exam')
-- ============================================================

-- Thêm cột source
ALTER TABLE arena_topics ADD COLUMN IF NOT EXISTS source text DEFAULT 'arena';

-- Đặt tất cả chủ đề hiện có thành 'arena' (mặc định)
UPDATE arena_topics SET source = 'arena' WHERE source IS NULL;
