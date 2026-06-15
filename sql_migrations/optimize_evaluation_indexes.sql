-- =============================================
-- TỐI ƯU HÓA CHỈ MỤC TÌM KIẾM CHO ĐÁNH GIÁ HẰNG NGÀY
-- =============================================

-- Chỉ mục kết hợp giúp truy vấn nhanh theo lớp và ngày
CREATE INDEX IF NOT EXISTS idx_daily_evaluations_class_date 
ON public.daily_evaluations(class_id, evaluation_date);
