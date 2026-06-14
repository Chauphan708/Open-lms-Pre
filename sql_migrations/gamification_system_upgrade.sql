-- ============================================
-- SQL Migration: Nâng cấp Gamification & Hệ Thống Leo Tháp Thích Ứng cho Đấu Trường
-- Chạy đoạn mã này trong Supabase SQL Editor
-- ============================================

-- 1. Thêm cột lưu nhiệm vụ hàng ngày (Daily Quests)
ALTER TABLE public.arena_profiles ADD COLUMN IF NOT EXISTS daily_quests JSONB DEFAULT '[]';

-- 2. Thêm cột lưu danh sách Huy hiệu đã mở khóa (Badges)
ALTER TABLE public.arena_profiles ADD COLUMN IF NOT EXISTS unlocked_badges TEXT[] DEFAULT '{}';

-- 3. Thêm cột lưu Danh hiệu đang trang bị (Equipped Title)
ALTER TABLE public.arena_profiles ADD COLUMN IF NOT EXISTS active_title TEXT DEFAULT 'Học Giả Tập Sự';

-- 4. Thêm cột lưu độ làm chủ chuyên đề thích ứng (Topic Mastery)
ALTER TABLE public.arena_profiles ADD COLUMN IF NOT EXISTS topic_mastery JSONB DEFAULT '{}';
