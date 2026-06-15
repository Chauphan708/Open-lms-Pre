-- Migration to add grade column to arena_questions
ALTER TABLE public.arena_questions ADD COLUMN IF NOT EXISTS grade TEXT;

-- Update existing questions to have a default grade if null (e.g., '4')
UPDATE public.arena_questions SET grade = '4' WHERE grade IS NULL;
