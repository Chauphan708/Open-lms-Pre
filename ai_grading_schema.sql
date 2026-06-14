-- =================================================================================
-- AI GRADING FEATURE SCHEMA
-- Mục đích: Bảng dữ liệu quản lý bài nộp và đánh giá AI.
-- Chạy đoạn script này trên SUPABASE SQL EDITOR CHÍNH của OpenLMS
-- =================================================================================

-- 1. Bảng lưu trữ bài nộp (Chỉ lưu text URL, file gốc nằm ở DB thứ 2)
CREATE TABLE IF NOT EXISTS public.ai_submissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID NOT NULL, -- Tham chieu students
    class_id UUID NOT NULL,   -- Tham chieu classes
    teacher_id UUID NOT NULL,
    exam_id UUID,             -- Khong bat buoc
    
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    
    external_file_url TEXT NOT NULL, 
    file_type VARCHAR(50) DEFAULT 'image',
    
    status VARCHAR(50) DEFAULT 'pending', -- 'pending' | 'graded'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Bảng lưu trữ kết quả đánh giá phân tích của AI
CREATE TABLE IF NOT EXISTS public.ai_grading_reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    submission_id UUID NOT NULL REFERENCES public.ai_submissions(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL,
    
    advantages TEXT,
    limitations TEXT,
    improvements TEXT,
    
    score_optional INTEGER, -- Thang điểm 100, có thể null nếu đánh giá 0 điểm
    
    custom_ai_prompt TEXT,
    raw_ai_response TEXT,
    
    is_published_to_student BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tạo Index tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_ai_submissions_student ON public.ai_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_submissions_teacher ON public.ai_submissions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ai_grading_reviews_submission ON public.ai_grading_reviews(submission_id);

-- GHI CHÚ BẢO MẬT --
-- Nhớ thiết lập Row Level Security (RLS) để Giáo viên chỉ nhìn thấy submission học sinh lớp mình, 
-- và HS chỉ xem được review khi is_published_to_student = true.
