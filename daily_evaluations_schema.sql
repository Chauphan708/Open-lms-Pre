-- =============================================
-- ĐÁNH GIÁ HẰNG NGÀY - Supabase Schema
-- Chạy script này trên Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS public.daily_evaluations (
    id text primary key default concat('eval_', replace(gen_random_uuid()::text, '-', '')),
    student_id text not null references public.profiles(id) on delete cascade,
    teacher_id text not null references public.profiles(id) on delete cascade,
    class_id text not null,
    evaluation_date date not null,
    subjects jsonb default '{}'::jsonb,
    competencies jsonb default '{}'::jsonb,
    qualities jsonb default '{}'::jsonb,
    general_comment text,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    -- Mỗi học sinh chỉ có 1 bản đánh giá từ 1 giáo viên trong 1 ngày
    CONSTRAINT daily_evaluations_unique_record UNIQUE(student_id, teacher_id, evaluation_date)
);

-- Indexes cho hiệu suất truy vấn
CREATE INDEX IF NOT EXISTS idx_daily_evaluations_student ON public.daily_evaluations(student_id);
CREATE INDEX IF NOT EXISTS idx_daily_evaluations_teacher ON public.daily_evaluations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_daily_evaluations_class ON public.daily_evaluations(class_id);
CREATE INDEX IF NOT EXISTS idx_daily_evaluations_date ON public.daily_evaluations(evaluation_date);

-- RLS Policies
ALTER TABLE public.daily_evaluations ENABLE ROW LEVEL SECURITY;

-- 1. Read: Chỉ giáo viên được xem đánh giá do mình lập (Ép kiểu UUID sang TEXT)
DROP POLICY IF EXISTS "Teacher read access" ON public.daily_evaluations;
CREATE POLICY "Teacher read access" ON public.daily_evaluations 
FOR SELECT TO authenticated 
USING (auth.uid()::text = teacher_id);

-- 2. Modify: Chỉ giáo viên được thêm/sửa/xoá đánh giá do mình tạo
DROP POLICY IF EXISTS "Teacher full access" ON public.daily_evaluations;
CREATE POLICY "Teacher full access" ON public.daily_evaluations 
FOR ALL TO authenticated 
USING (auth.uid()::text = teacher_id) 
WITH CHECK (auth.uid()::text = teacher_id);

-- Enable Realtime cho bảng mới
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_evaluations;
