-- SQL Migration: Bổ sung cột 'grade' vào bảng 'arena_topics' để quản lý lớp của chuyên đề
-- Chạy đoạn mã này trong Supabase SQL Editor

ALTER TABLE public.arena_topics ADD COLUMN IF NOT EXISTS grade TEXT DEFAULT '5';
