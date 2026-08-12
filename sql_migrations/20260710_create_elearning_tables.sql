-- =====================================================
-- E-LEARNING MODULE — DATABASE MIGRATION
-- Created: 2026-07-10
-- Tables: el_courses, el_chapters, el_lessons,
--         el_student_progress, el_study_history, el_lesson_comments
-- =====================================================

-- 1. COURSES (Khóa học)
CREATE TABLE IF NOT EXISTS public.el_courses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  cover_image TEXT,
  created_by TEXT NOT NULL REFERENCES public.profiles(id),
  assigned_class_ids TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  deadline TIMESTAMPTZ,
  xp_reward INTEGER DEFAULT 50,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CHAPTERS (Chương)
CREATE TABLE IF NOT EXISTS public.el_chapters (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  course_id TEXT NOT NULL REFERENCES public.el_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_hidden BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. LESSONS (Bài học)
CREATE TABLE IF NOT EXISTS public.el_lessons (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  chapter_id TEXT NOT NULL REFERENCES public.el_chapters(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES public.el_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  drive_url TEXT,
  video_url TEXT,
  video_duration INTEGER DEFAULT 0,
  min_study_time INTEGER DEFAULT 60,
  requires_previous BOOLEAN DEFAULT true,
  is_hidden BOOLEAN DEFAULT false,
  quiz_id TEXT,
  video_questions JSONB DEFAULT '[]',
  xp_reward INTEGER DEFAULT 10,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. STUDENT PROGRESS (Tiến độ học sinh)
CREATE TABLE IF NOT EXISTS public.el_student_progress (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id TEXT NOT NULL REFERENCES public.profiles(id),
  course_id TEXT NOT NULL REFERENCES public.el_courses(id) ON DELETE CASCADE,
  completed_lessons TEXT[] DEFAULT '{}',
  current_lesson_id TEXT,
  total_study_time INTEGER DEFAULT 0,
  best_quiz_scores JSONB DEFAULT '{}',
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(student_id, course_id)
);

-- 5. STUDY HISTORY (Lịch sử học tập — append-only log)
CREATE TABLE IF NOT EXISTS public.el_study_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id TEXT NOT NULL REFERENCES public.profiles(id),
  course_id TEXT NOT NULL REFERENCES public.el_courses(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES public.el_lessons(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('VIDEO_WATCH', 'DOC_READ', 'QUIZ_ATTEMPT', 'LESSON_COMPLETE', 'COURSE_COMPLETE')),
  score REAL,
  time_spent INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. LESSON COMMENTS (Hỏi đáp bài học)
CREATE TABLE IF NOT EXISTS public.el_lesson_comments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lesson_id TEXT NOT NULL REFERENCES public.el_lessons(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.profiles(id),
  user_name TEXT NOT NULL,
  content TEXT NOT NULL,
  parent_comment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_el_chapters_course ON public.el_chapters(course_id);
CREATE INDEX IF NOT EXISTS idx_el_lessons_chapter ON public.el_lessons(chapter_id);
CREATE INDEX IF NOT EXISTS idx_el_lessons_course ON public.el_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_el_progress_student ON public.el_student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_el_progress_course ON public.el_student_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_el_history_student_date ON public.el_study_history(student_id, created_at);
CREATE INDEX IF NOT EXISTS idx_el_history_course ON public.el_study_history(course_id);
CREATE INDEX IF NOT EXISTS idx_el_comments_lesson ON public.el_lesson_comments(lesson_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS
ALTER TABLE public.el_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.el_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.el_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.el_student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.el_study_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.el_lesson_comments ENABLE ROW LEVEL SECURITY;

-- COURSES RLS
CREATE POLICY "el_courses_select" ON public.el_courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "el_courses_insert" ON public.el_courses FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = created_by);
CREATE POLICY "el_courses_update" ON public.el_courses FOR UPDATE TO authenticated
  USING (auth.uid()::text = created_by);
CREATE POLICY "el_courses_delete" ON public.el_courses FOR DELETE TO authenticated
  USING (auth.uid()::text = created_by);

-- CHAPTERS RLS
CREATE POLICY "el_chapters_select" ON public.el_chapters FOR SELECT TO authenticated USING (true);
CREATE POLICY "el_chapters_insert" ON public.el_chapters FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "el_chapters_update" ON public.el_chapters FOR UPDATE TO authenticated USING (true);
CREATE POLICY "el_chapters_delete" ON public.el_chapters FOR DELETE TO authenticated USING (true);

-- LESSONS RLS
CREATE POLICY "el_lessons_select" ON public.el_lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "el_lessons_insert" ON public.el_lessons FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "el_lessons_update" ON public.el_lessons FOR UPDATE TO authenticated USING (true);
CREATE POLICY "el_lessons_delete" ON public.el_lessons FOR DELETE TO authenticated USING (true);

-- STUDENT PROGRESS RLS
CREATE POLICY "el_progress_select" ON public.el_student_progress FOR SELECT TO authenticated USING (true);
CREATE POLICY "el_progress_insert" ON public.el_student_progress FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = student_id);
CREATE POLICY "el_progress_update" ON public.el_student_progress FOR UPDATE TO authenticated
  USING (auth.uid()::text = student_id);

-- STUDY HISTORY RLS (append-only for students)
CREATE POLICY "el_history_select" ON public.el_study_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "el_history_insert" ON public.el_study_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = student_id);

-- LESSON COMMENTS RLS
CREATE POLICY "el_comments_select" ON public.el_lesson_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "el_comments_insert" ON public.el_lesson_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "el_comments_update" ON public.el_lesson_comments FOR UPDATE TO authenticated
  USING (auth.uid()::text = user_id);
CREATE POLICY "el_comments_delete" ON public.el_lesson_comments FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);
