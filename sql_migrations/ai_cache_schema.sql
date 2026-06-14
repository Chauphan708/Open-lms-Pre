-- SQL Migration: Tạo bảng ai_analysis_cache lưu trữ dữ liệu phản hồi từ Gemini
-- Giúp tối ưu hóa chi phí API, tăng tốc phản hồi xuống dưới 100ms

CREATE TABLE IF NOT EXISTS public.ai_analysis_cache (
    id text NOT NULL DEFAULT (gen_random_uuid())::text,
    cache_key text NOT NULL UNIQUE,
    response_text text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ai_analysis_cache_pkey PRIMARY KEY (id)
);

-- Bật Row Level Security (RLS) để bảo vệ bảng cache
ALTER TABLE public.ai_analysis_cache ENABLE ROW LEVEL SECURITY;

-- Tạo chính sách cho phép mọi người dùng đã xác thực (Học sinh, GV, Phụ huynh) đọc và ghi cache
CREATE POLICY "Allow authenticated users to read cache" ON public.ai_analysis_cache
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert cache" ON public.ai_analysis_cache
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update cache" ON public.ai_analysis_cache
    FOR UPDATE TO authenticated USING (true);
