-- =================================================================================
-- KÍCH HOẠT REALTIME CHO BẢNG ATTEMPTS
-- Mục đích: Giúp giáo viên nhận bài nộp của học sinh ngay lập tức mà không cần F5.
-- Chạy đoạn script này trên SUPABASE SQL EDITOR CHÍNH của bạn.
-- =================================================================================

-- 1. Bật Realtime cho bảng attempts
BEGIN;
  -- Thêm bảng attempts vào publication supabase_realtime nếu chưa có
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'attempts'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.attempts;
    END IF;
  EXCEPTION WHEN undefined_object THEN
    -- Nếu chưa có publication supabase_realtime thì tạo mới
    CREATE PUBLICATION supabase_realtime FOR TABLE public.attempts;
  END $$;
COMMIT;

-- 2. Kiểm tra lại cấu trúc bảng attempts (Đảm bảo có cột created_at để sắp xếp)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attempts' AND column_name = 'created_at') THEN
        ALTER TABLE public.attempts ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;
