-- ============================================
-- SQL Migration: Thêm cấu hình thời gian, điểm thưởng và loại câu hỏi MCQ_MULTIPLE, SHORT_ANSWER cho Đấu Trí
-- Chạy đoạn mã này trong Supabase SQL Editor
-- ============================================

-- 1. Thêm cột thời gian đếm ngược (mặc định 30 giây)
ALTER TABLE public.arena_questions ADD COLUMN IF NOT EXISTS time_limit_seconds INT DEFAULT 30 CHECK (time_limit_seconds >= 5 AND time_limit_seconds <= 300);

-- 2. Thêm cột điểm kinh nghiệm thưởng (mặc định 10 XP)
ALTER TABLE public.arena_questions ADD COLUMN IF NOT EXISTS xp_reward INT DEFAULT 10 CHECK (xp_reward >= 1 AND xp_reward <= 500);

-- 3. Thêm cột loại câu hỏi (mặc định 'MCQ')
ALTER TABLE public.arena_questions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'MCQ' CHECK (type IN ('MCQ', 'MCQ_MULTIPLE', 'SHORT_ANSWER'));

-- 4. Thêm cột mảng đáp án đúng (cho MCQ_MULTIPLE)
ALTER TABLE public.arena_questions ADD COLUMN IF NOT EXISTS correct_indices JSONB;

-- 5. Thêm cột chuỗi đáp án đúng (cho SHORT_ANSWER)
ALTER TABLE public.arena_questions ADD COLUMN IF NOT EXISTS correct_answer_string TEXT;

-- 6. Cập nhật các câu hỏi hiện tại về giá trị mặc định nếu rỗng
UPDATE public.arena_questions SET time_limit_seconds = 30 WHERE time_limit_seconds IS NULL;
UPDATE public.arena_questions SET xp_reward = 10 WHERE xp_reward IS NULL;
UPDATE public.arena_questions SET type = 'MCQ' WHERE type IS NULL;
