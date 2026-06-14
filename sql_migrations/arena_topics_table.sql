-- ============================================
-- SQL Migration: Tạo bảng quản lý chuyên đề tùy chỉnh (arena_topics)
-- Chạy đoạn mã này trong Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS public.arena_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject TEXT NOT NULL, -- math, science, technology, vietnamese, english
  topic TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subject, topic)
);

-- Bật bảo mật dòng (Row Level Security)
ALTER TABLE public.arena_topics ENABLE ROW LEVEL SECURITY;

-- Tạo chính sách xem công khai cho tất cả người dùng đã đăng nhập (Học sinh và Giáo viên)
DROP POLICY IF EXISTS "Anyone logged in can read topics" ON public.arena_topics;
CREATE POLICY "Anyone logged in can read topics" 
  ON public.arena_topics FOR SELECT 
  TO authenticated 
  USING (true);

-- Chỉ cho phép Giáo viên và Admin quản lý chuyên đề (Thêm/Sửa/Xóa)
DROP POLICY IF EXISTS "Teachers and admins manage topics" ON public.arena_topics;
CREATE POLICY "Teachers and admins manage topics" 
  ON public.arena_topics FOR ALL 
  TO authenticated 
  USING (
    (SELECT role FROM public.profiles WHERE id::text = auth.uid()::text) IN ('ADMIN', 'TEACHER')
  );
