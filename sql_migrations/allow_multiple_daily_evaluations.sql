-- =============================================
-- CHO PHÉP NHIỀU NHẬN XÉT MỖI NGÀY CHO 1 HỌC SINH
-- =============================================

ALTER TABLE public.daily_evaluations
DROP CONSTRAINT IF EXISTS daily_evaluations_unique_record;
