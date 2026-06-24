-- Migration to add case_sensitive column to arena_questions
ALTER TABLE public.arena_questions ADD COLUMN IF NOT EXISTS case_sensitive BOOLEAN DEFAULT FALSE;
