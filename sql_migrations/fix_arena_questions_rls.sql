-- ============================================
-- SQL MIGRATION: VÁ CHẶT RLS VÀ CẤP QUYỀN GHI CHO GIÁO VIÊN/ADMIN TRÊN BẢNG ARENA_QUESTIONS
-- Chạy đoạn mã này trong Supabase SQL Editor
-- ============================================

-- Kích hoạt RLS cho bảng arena_questions nếu chưa bật
ALTER TABLE public.arena_questions ENABLE ROW LEVEL SECURITY;

-- Xóa các policy cũ để tránh trùng lặp hoặc xung đột
DROP POLICY IF EXISTS "Arena questions public access" ON public.arena_questions;
DROP POLICY IF EXISTS "Authenticated read access" ON public.arena_questions;
DROP POLICY IF EXISTS "Teacher full access" ON public.arena_questions;
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.arena_questions;
DROP POLICY IF EXISTS "Allow teachers and admins full access" ON public.arena_questions;

-- 1. Cho phép tất cả người dùng đã đăng nhập (Học sinh, Giáo viên, Admin) được phép ĐỌC câu hỏi đấu trí
CREATE POLICY "Allow authenticated read access" 
ON public.arena_questions FOR SELECT 
TO authenticated 
USING (true);

-- 2. Chỉ cho phép Giáo viên (TEACHER) và Quản trị viên (ADMIN) được phép THÊM, SỬA, XÓA câu hỏi đấu trí
CREATE POLICY "Allow teachers and admins full access" 
ON public.arena_questions FOR ALL 
TO authenticated 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()::text) IN ('ADMIN', 'TEACHER')
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()::text) IN ('ADMIN', 'TEACHER')
);
