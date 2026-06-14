-- Chạy đoạn lệnh sau trong mục SQL Editor của Supabase để thêm các cột mới cho tính năng AI & Analytics
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS "mode" text;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS "studentIds" jsonb;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS "totalTimeSpentSec" integer;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS "timeSpentPerQuestion" jsonb;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS "cheatWarnings" integer;
