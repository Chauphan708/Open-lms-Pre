-- ============================================
-- SQL MIGRATION: UPDATE DIFFICULTY CHECK CONSTRAINT ON public.arena_questions
-- Chạy đoạn mã này trong Supabase SQL Editor
-- ============================================

-- 1. Xóa Check Constraint cũ giới hạn độ khó từ 1 đến 3
ALTER TABLE public.arena_questions DROP CONSTRAINT IF EXISTS arena_questions_difficulty_check;

-- 2. Thêm Check Constraint mới cho phép độ khó từ 1 đến 4 (Mức nâng cao)
ALTER TABLE public.arena_questions ADD CONSTRAINT arena_questions_difficulty_check 
  CHECK (difficulty >= 1 AND difficulty <= 4);
