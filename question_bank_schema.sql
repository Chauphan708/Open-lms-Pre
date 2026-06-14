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

-- 4. TẠM THỜI TẮT RLS ĐỂ KIỂM TRA (DISABLE RLS)
-- Việc này sẽ giúp chúng ta xác định lỗi 401/42501 là do Auth hay RLS
ALTER TABLE public.question_bank DISABLE ROW LEVEL SECURITY;

-- 5. Cấp quyền truy cập cho mọi vai trò (An toàn cho việc test)
GRANT ALL ON public.question_bank TO anon;
GRANT ALL ON public.question_bank TO authenticated;
GRANT ALL ON public.question_bank TO service_role;
