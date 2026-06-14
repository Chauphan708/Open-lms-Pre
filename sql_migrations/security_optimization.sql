-- ============================================
-- SQL MIGRATION: BẢO MẬT CƠ SỞ DỮ LIỆU & RLS
-- Chạy script này trong Supabase SQL Editor để tối ưu hóa bảo mật
-- ============================================

-- 1. LOẠI BỎ CỘT PLAINTEXT PASSWORD
ALTER TABLE IF EXISTS public.profiles DROP COLUMN IF EXISTS password;

-- 2. KÍCH HOẠT RLS TRÊN CÁC BẢNG QUAN TRỌNG
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Dọn dẹp các policy cũ nếu có
DROP POLICY IF EXISTS "Allow public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow user update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public access" ON public.profiles;

-- 3. CHÍNH SÁCH BẢO MẬT CHO BẢNG PROFILES
CREATE POLICY "Cho phép đọc thông tin profile công khai"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Cho phép người dùng tự cập nhật thông tin cá nhân"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = id)
    WITH CHECK (auth.uid()::text = id);

-- 4. CHÍNH SÁCH BẢO MẬT CHO BẢNG EXAMS
DROP POLICY IF EXISTS "Public access" ON public.exams;

CREATE POLICY "Cho phép tất cả đọc đề thi công khai hoặc được chia sẻ"
    ON public.exams FOR SELECT
    TO authenticated
    USING (is_public = true OR status = 'PUBLISHED' OR auth.uid()::text = teacher_id);

CREATE POLICY "Cho phép giáo viên quản lý đề thi của mình"
    ON public.exams FOR ALL
    TO authenticated
    USING (auth.uid()::text = teacher_id)
    WITH CHECK (auth.uid()::text = teacher_id);

-- 5. CHÍNH SÁCH BẢO MẬT CHO BẢNG ATTEMPTS
DROP POLICY IF EXISTS "Public access" ON public.attempts;

CREATE POLICY "Học sinh xem lượt làm bài của chính mình"
    ON public.attempts FOR SELECT
    TO authenticated
    USING (auth.uid()::text = student_id);

CREATE POLICY "Học sinh nộp bài thi mới"
    ON public.attempts FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::text = student_id);

CREATE POLICY "Giáo viên xem tất cả lượt làm bài thi"
    ON public.attempts FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.exams 
            WHERE exams.id = attempts.exam_id 
            AND exams.teacher_id = auth.uid()::text
        )
    );

-- 6. CHÍNH SÁCH BẢO MẬT CHO BẢNG ASSIGNMENTS
DROP POLICY IF EXISTS "Public access" ON public.assignments;

CREATE POLICY "Cho phép xem bài tập được giao"
    ON public.assignments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Cho phép giáo viên quản lý bài tập của mình"
    ON public.assignments FOR ALL
    TO authenticated
    USING (auth.uid()::text = teacher_id)
    WITH CHECK (auth.uid()::text = teacher_id);
