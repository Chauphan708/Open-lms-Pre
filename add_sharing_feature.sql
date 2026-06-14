-- SQL migration to add sharing features to the exams table

-- 1. Add new columns to exams table
ALTER TABLE public.exams 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS share_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_code_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS original_author_id TEXT REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS original_author_name TEXT,
ADD COLUMN IF NOT EXISTS contributors TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS parent_exam_id TEXT REFERENCES public.exams(id),
ADD COLUMN IF NOT EXISTS downloads INTEGER DEFAULT 0;

-- 2. Indexing for performance
CREATE INDEX IF NOT EXISTS idx_exams_is_public ON public.exams(is_public);
CREATE INDEX IF NOT EXISTS idx_exams_share_code ON public.exams(share_code);

-- 3. Update RLS Policies for exams
-- Allow teachers to view public exams from others
DROP POLICY IF EXISTS "Public exams are viewable by all teachers" ON public.exams;
CREATE POLICY "Public exams are viewable by all teachers" 
ON public.exams FOR SELECT 
USING (
    is_public = true OR 
    auth.uid()::text = teacher_id OR 
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = 'ADMIN'))
);

-- 4. Update Notifications support
-- Đảm bảo có cột payload để lưu trữ thông tin đề thi khi chia sẻ trực tiếp
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;
