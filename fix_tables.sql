-- Tạo bảng Ngân hàng câu hỏi (Cho Arena và các tính năng khác)
CREATE TABLE IF NOT EXISTS public.question_bank (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    options JSONB DEFAULT '[]'::JSONB,
    correct_option_index INTEGER,
    solution TEXT,
    hint TEXT,
    level TEXT,
    topic TEXT,
    subject TEXT,
    grade TEXT,
    is_arena_eligible BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    teacher_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Bật RLS
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

-- Policy bảo mật cho phép tất cả tài khoản đọc, nhưng chỉ giáo viên/admin được sửa đổi
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

-- Cập nhật bảng attempts (Nếu thiếu các cột mới)
ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS total_time_spent_sec INTEGER;
ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS time_spent_per_question JSONB;
ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS cheat_warnings INTEGER;
