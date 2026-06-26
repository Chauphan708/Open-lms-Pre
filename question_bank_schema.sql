-- ==========================================
-- SCRIPT KHỞI TẠO LẠI (PHIÊN BẢN CẤP QUYỀN TỐI ĐA - GOD MODE)
-- ==========================================

-- 1. Bật extension UUID
create extension if not exists "uuid-ossp";

-- 2. Xóa sạch bảng cũ
DROP TABLE IF EXISTS public.question_bank CASCADE;

-- 3. Tạo lại bảng
CREATE TABLE public.question_bank (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    type TEXT NOT NULL,
    options JSONB,
    correct_option_index INTEGER,
    solution TEXT,
    hint TEXT,
    image_url TEXT,
    level TEXT,
    subject TEXT,
    grade TEXT,
    topic TEXT,
    is_arena_eligible BOOLEAN DEFAULT FALSE,
    teacher_id TEXT, 
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bật RLS
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

-- 5. Thiết lập chính sách bảo mật
CREATE POLICY "Authenticated read access" ON public.question_bank FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teacher write access" ON public.question_bank FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid()::text 
        AND role IN ('TEACHER', 'ADMIN')
    )
);
CREATE POLICY "Teacher update access" ON public.question_bank FOR UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid()::text 
        AND role IN ('TEACHER', 'ADMIN')
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid()::text 
        AND role IN ('TEACHER', 'ADMIN')
    )
);
CREATE POLICY "Teacher delete access" ON public.question_bank FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid()::text 
        AND role IN ('TEACHER', 'ADMIN')
    )
);
