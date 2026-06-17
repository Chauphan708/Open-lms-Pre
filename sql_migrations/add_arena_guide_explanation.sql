-- SQL Migration to add 'guide' and 'explanation' columns to the 'arena_questions' table

ALTER TABLE public.arena_questions ADD COLUMN IF NOT EXISTS guide TEXT;
ALTER TABLE public.arena_questions ADD COLUMN IF NOT EXISTS explanation TEXT;

COMMENT ON COLUMN public.arena_questions.guide IS 'Hướng dẫn (chỉ gợi ý cách tính, cách làm, không nêu đáp án)';
COMMENT ON COLUMN public.arena_questions.explanation IS 'Lời giải chi tiết (ghi ra từng bước kèm đáp án)';
