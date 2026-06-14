-- ==========================================================
-- TẬP LỆNH CHUẨN HÓA CƠ SỞ DỮ LIỆU (ULTIMATE FIX)
-- Chạy đoạn này trong SQL Editor của Supabase để sửa lỗi 400
-- ==========================================================

-- 1. Bổ sung cột teacher_id vào bảng exams (Nếu chưa có)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'teacher_id') THEN
        ALTER TABLE public.exams ADD COLUMN teacher_id TEXT REFERENCES public.profiles(id);
    END IF;
END $$;

-- 2. Đồng bộ dữ liệu cũ: RENAME teacherId sang teacher_id nếu lỡ dùng camelCase
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'teacherId') THEN
        UPDATE public.exams SET teacher_id = "teacherId" WHERE teacher_id IS NULL;
        -- ALTER TABLE public.exams DROP COLUMN "teacherId"; -- Không xóa vội để an toàn
    END IF;
END $$;

-- 3. Bổ sung cột teacher_id vào bảng assignments (Nếu chưa có)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'teacher_id') THEN
        ALTER TABLE public.assignments ADD COLUMN teacher_id TEXT REFERENCES public.profiles(id);
    END IF;
END $$;

-- 4. Gán quyền sở hữu mặc định cho các bài tập/đề thi đang bị "vô chủ" 
-- (Tạm thời gán cho admin hoặc để trống, nhưng đảm bảo cột tồn tại)
UPDATE public.exams SET teacher_id = 't_1771423388945' WHERE teacher_id IS NULL; -- Thay ID này bằng ID của bạn nếu cần

-- 5. Kích hoạt RLS (An toàn dữ liệu)
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- 6. Tạo Policy cho phép Giáo viên chỉ thấy dữ liệu của mình
DROP POLICY IF EXISTS "Teachers can manage their own exams" ON public.exams;
CREATE POLICY "Teachers can manage their own exams" ON public.exams
FOR ALL USING (auth.uid()::text = teacher_id OR teacher_id IS NULL);

DROP POLICY IF EXISTS "Teachers can manage their own assignments" ON public.assignments;
CREATE POLICY "Teachers can manage their own assignments" ON public.assignments
FOR ALL USING (auth.uid()::text = teacher_id OR teacher_id IS NULL);

-- 7. Cấp quyền truy cập cho người dùng (Thêm một lần nữa cho chắc)
GRANT ALL ON public.exams TO anon, authenticated, service_role;
GRANT ALL ON public.assignments TO anon, authenticated, service_role;
GRANT ALL ON public.question_bank TO anon, authenticated, service_role;
