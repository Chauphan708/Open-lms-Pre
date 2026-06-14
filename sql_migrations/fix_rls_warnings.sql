-- ============================================
-- SQL MIGRATION: KHẮC PHỤC CẢNH BÁO BẢO MẬT RLS TRÊN SUPABASE
-- Chạy đoạn mã này trong Supabase SQL Editor
-- ============================================

-- 1. BẢNG CLASSES (Lớp học)
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Classes read access" ON public.classes;
DROP POLICY IF EXISTS "Teachers and admins manage classes" ON public.classes;

CREATE POLICY "Classes read access" 
  ON public.classes FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Teachers and admins manage classes" 
  ON public.classes FOR ALL 
  TO authenticated 
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()::text) IN ('ADMIN', 'TEACHER')
  );


-- 2. BẢNG ASSIGNMENTS (Bài tập)
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Assignments read access" ON public.assignments;
DROP POLICY IF EXISTS "Teachers manage assignments" ON public.assignments;

CREATE POLICY "Assignments read access" 
  ON public.assignments FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Teachers manage assignments" 
  ON public.assignments FOR ALL 
  TO authenticated 
  USING (
    auth.uid()::text = teacher_id 
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()::text) = 'ADMIN'
  );


-- 3. BẢNG NOTIFICATIONS (Thông báo)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow authenticated insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;

CREATE POLICY "Users read own notifications" 
  ON public.notifications FOR SELECT 
  TO authenticated 
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users update own notifications" 
  ON public.notifications FOR UPDATE 
  TO authenticated 
  USING (auth.uid()::text = user_id) 
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Allow authenticated insert notifications" 
  ON public.notifications FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Users delete own notifications" 
  ON public.notifications FOR DELETE 
  TO authenticated 
  USING (auth.uid()::text = user_id);


-- 4. BẢNG AI_SUBMISSIONS (Bài nộp AI OCR/LMS)
ALTER TABLE public.ai_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read submissions" ON public.ai_submissions;
DROP POLICY IF EXISTS "Insert own submissions" ON public.ai_submissions;
DROP POLICY IF EXISTS "Teachers manage submissions" ON public.ai_submissions;

CREATE POLICY "Read submissions" 
  ON public.ai_submissions FOR SELECT 
  TO authenticated 
  USING (
    auth.uid()::text = student_id 
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()::text) IN ('ADMIN', 'TEACHER')
  );

CREATE POLICY "Insert own submissions" 
  ON public.ai_submissions FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid()::text = student_id);

CREATE POLICY "Teachers manage submissions" 
  ON public.ai_submissions FOR ALL 
  TO authenticated 
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()::text) IN ('ADMIN', 'TEACHER')
  );


-- 5. BẢNG AI_GRADING_REVIEWS (Đánh giá chấm điểm AI)
ALTER TABLE public.ai_grading_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read reviews" ON public.ai_grading_reviews;
DROP POLICY IF EXISTS "Teachers manage reviews" ON public.ai_grading_reviews;

CREATE POLICY "Read reviews" 
  ON public.ai_grading_reviews FOR SELECT 
  TO authenticated 
  USING (
    auth.uid()::text = student_id 
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()::text) IN ('ADMIN', 'TEACHER')
  );

CREATE POLICY "Teachers manage reviews" 
  ON public.ai_grading_reviews FOR ALL 
  TO authenticated 
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()::text) IN ('ADMIN', 'TEACHER')
  );


-- 6. BẢNG PORTFOLIO_SHARES (Chia sẻ hồ sơ học tập)
ALTER TABLE public.portfolio_shares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read portfolio shares" ON public.portfolio_shares;
DROP POLICY IF EXISTS "Manage own portfolio shares" ON public.portfolio_shares;

CREATE POLICY "Read portfolio shares" 
  ON public.portfolio_shares FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Manage own portfolio shares" 
  ON public.portfolio_shares FOR ALL 
  TO authenticated 
  USING (auth.uid()::text = student_id);


-- 7. BẢNG DAILY_EVALUATIONS (Nhận xét hàng ngày)
ALTER TABLE public.daily_evaluations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read evaluations" ON public.daily_evaluations;
DROP POLICY IF EXISTS "Teachers manage evaluations" ON public.daily_evaluations;

CREATE POLICY "Read evaluations" 
  ON public.daily_evaluations FOR SELECT 
  TO authenticated 
  USING (
    auth.uid()::text = student_id 
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()::text) IN ('ADMIN', 'TEACHER')
  );

CREATE POLICY "Teachers manage evaluations" 
  ON public.daily_evaluations FOR ALL 
  TO authenticated 
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()::text) IN ('ADMIN', 'TEACHER')
  );
