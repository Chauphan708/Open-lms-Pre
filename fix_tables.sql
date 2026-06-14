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

-- Policy công khai cho phép đọc/ghi (Bạn có thể tinh chỉnh sau)
CREATE POLICY "Public access" ON public.question_bank FOR ALL USING (true) WITH CHECK (true);

-- Cập nhật bảng attempts (Nếu thiếu các cột mới)
ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS total_time_spent_sec INTEGER;
ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS time_spent_per_question JSONB;
ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS cheat_warnings INTEGER;
