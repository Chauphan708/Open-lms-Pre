-- SQL Migration: Bổ sung cột 'is_hidden' vào bảng 'arena_topics' để quản lý ẩn/hiển thị chuyên đề với học sinh
ALTER TABLE public.arena_topics ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
