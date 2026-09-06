-- ═══════════════════════════════════════════════════════════════════════════════
-- SQL MIGRATION: SECURITY HARDENING & SCHEMA MASTER FIX (SELF-CONTAINED & IDEMPOTENT)
-- Cập nhật: 2026-09-05
-- Phiên bản an toàn: Tự động khởi tạo cấu trúc bảng nếu chưa tồn tại
-- ═══════════════════════════════════════════════════════════════════════════════

-- Bật các extensions cần thiết
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- BƯỚC 1: KHỞI TẠO BẢNG NẾU CHƯA TỒN TẠI (TỰ ĐỘNG CHỐNG LỖI 42P01 NOT EXIST)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Bảng academic_years (Niên khóa & Học kỳ)
CREATE TABLE IF NOT EXISTS public.academic_years (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    semesters JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Bảng teacher_notes (Sổ tay giáo viên)
CREATE TABLE IF NOT EXISTS public.teacher_notes (
    id TEXT PRIMARY KEY,
    teacher_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    tag TEXT DEFAULT 'Giáo án',
    color TEXT DEFAULT '#fef3c7',
    is_pinned BOOLEAN DEFAULT false,
    todo_list JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Bảng custom_topics (Chủ đề tùy chỉnh)
CREATE TABLE IF NOT EXISTS public.custom_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    teacher_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(name, teacher_id)
);

-- 4. Bảng teacher_auto_point_settings (Thiết lập điểm nề nếp tự động)
CREATE TABLE IF NOT EXISTS public.teacher_auto_point_settings (
    id TEXT PRIMARY KEY,
    teacher_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    percentage INT NOT NULL,
    points INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Bảng resources (Kho tài nguyên học tập)
CREATE TABLE IF NOT EXISTS public.resources (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT DEFAULT 'LINK' CHECK (type IN ('LINK', 'EMBED')),
    topic TEXT DEFAULT 'General',
    description TEXT,
    added_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Đảm bảo cột snake_case cho resources
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS added_by TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='resources' AND column_name='addedby') THEN
        UPDATE public.resources SET added_by = addedby WHERE added_by IS NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='resources' AND column_name='createdat') THEN
        UPDATE public.resources SET created_at = createdat WHERE created_at IS NULL;
    END IF;
END $$;

-- 6. Bảng ai_requests (Yêu cầu phân tích AI của học sinh)
CREATE TABLE IF NOT EXISTS public.ai_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    feature_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    request_data JSONB NOT NULL,
    response_data TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    actioned_by TEXT,
    actioned_at TIMESTAMPTZ
);

-- 7. Cụm bảng E-Learning
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

CREATE TABLE IF NOT EXISTS public.el_chapters (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    course_id TEXT NOT NULL REFERENCES public.el_courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_hidden BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.el_lesson_comments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    lesson_id TEXT NOT NULL REFERENCES public.el_lessons(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.profiles(id),
    user_name TEXT NOT NULL,
    content TEXT NOT NULL,
    parent_comment_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.el_study_history_monthly (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    student_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES public.el_courses(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL,
    total_sessions INTEGER DEFAULT 0,
    total_study_time_sec INTEGER DEFAULT 0,
    total_watch_time_sec INTEGER DEFAULT 0,
    lessons_studied TEXT[] DEFAULT '{}',
    avg_quiz_score REAL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(student_id, course_id, month_year)
);

-- 8. Bảng arena_profiles (nếu chưa có)
CREATE TABLE IF NOT EXISTS public.arena_profiles (
    id TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    avatar_class TEXT DEFAULT 'scholar' CHECK (avatar_class IN ('scholar', 'scientist', 'artist', 'explorer')),
    elo_rating INT DEFAULT 0,
    total_xp INT DEFAULT 0,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    tower_floor INT DEFAULT 1,
    daily_quests JSONB DEFAULT '[]',
    unlocked_badges TEXT[] DEFAULT '{}',
    active_title TEXT DEFAULT 'Học Giả Tập Sự',
    topic_mastery JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Bổ sung các cột mở rộng cho arena_profiles nếu bảng đã tồn tại từ phiên bản cũ
ALTER TABLE public.arena_profiles ADD COLUMN IF NOT EXISTS daily_quests JSONB DEFAULT '[]';
ALTER TABLE public.arena_profiles ADD COLUMN IF NOT EXISTS unlocked_badges TEXT[] DEFAULT '{}';
ALTER TABLE public.arena_profiles ADD COLUMN IF NOT EXISTS active_title TEXT DEFAULT 'Học Giả Tập Sự';
ALTER TABLE public.arena_profiles ADD COLUMN IF NOT EXISTS topic_mastery JSONB DEFAULT '{}';


-- ─────────────────────────────────────────────────────────────────────────────
-- BƯỚC 2: BẬT ROW LEVEL SECURITY (RLS) TRÊN TẤT CẢ CÁC BẢNG LIÊN QUAN
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_auto_point_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.el_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.el_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.el_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.el_student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.el_study_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.el_lesson_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.el_study_history_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_profiles ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- BƯỚC 3: THIẾT LẬP CÁC CHÍNH SÁCH BẢO MẬT RLS AN TOÀN
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. academic_years
DROP POLICY IF EXISTS "Anyone authenticated can view academic_years" ON public.academic_years;
CREATE POLICY "Anyone authenticated can view academic_years" 
    ON public.academic_years FOR SELECT 
    TO authenticated 
    USING (true);

DROP POLICY IF EXISTS "Admins and teachers can manage academic_years" ON public.academic_years;
CREATE POLICY "Admins and teachers can manage academic_years" 
    ON public.academic_years FOR ALL 
    TO authenticated 
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role IN ('ADMIN', 'TEACHER'))
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role IN ('ADMIN', 'TEACHER'))
    );

-- 2. teacher_notes
DROP POLICY IF EXISTS "Teachers can view own notes" ON public.teacher_notes;
CREATE POLICY "Teachers can view own notes" 
    ON public.teacher_notes FOR SELECT 
    TO authenticated 
    USING (auth.uid()::text = teacher_id);

DROP POLICY IF EXISTS "Teachers can manage own notes" ON public.teacher_notes;
CREATE POLICY "Teachers can manage own notes" 
    ON public.teacher_notes FOR ALL 
    TO authenticated 
    USING (auth.uid()::text = teacher_id)
    WITH CHECK (auth.uid()::text = teacher_id);

-- 3. custom_topics
DROP POLICY IF EXISTS "Anyone authenticated can view custom_topics" ON public.custom_topics;
CREATE POLICY "Anyone authenticated can view custom_topics" 
    ON public.custom_topics FOR SELECT 
    TO authenticated 
    USING (true);

DROP POLICY IF EXISTS "Teachers can manage own custom_topics" ON public.custom_topics;
CREATE POLICY "Teachers can manage own custom_topics" 
    ON public.custom_topics FOR ALL 
    TO authenticated 
    USING (
        auth.uid()::text = teacher_id 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = 'ADMIN')
    )
    WITH CHECK (
        auth.uid()::text = teacher_id 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = 'ADMIN')
    );

-- 4. teacher_auto_point_settings
DROP POLICY IF EXISTS "Teachers can manage own auto point settings" ON public.teacher_auto_point_settings;
CREATE POLICY "Teachers can manage own auto point settings" 
    ON public.teacher_auto_point_settings FOR ALL 
    TO authenticated 
    USING (auth.uid()::text = teacher_id)
    WITH CHECK (auth.uid()::text = teacher_id);

-- 5. resources (Thu hồi anon, phân quyền giáo viên)
DO $$ BEGIN
    REVOKE ALL ON public.resources FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DROP POLICY IF EXISTS "Public access" ON public.resources;
DROP POLICY IF EXISTS "resources_read" ON public.resources;
DROP POLICY IF EXISTS "resources_modify" ON public.resources;

CREATE POLICY "resources_read" ON public.resources 
FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "resources_modify" ON public.resources 
FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role IN ('ADMIN', 'TEACHER'))
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role IN ('ADMIN', 'TEACHER'))
);

-- 6. ai_requests (Thu hồi anon, phân quyền bảo mật)
DO $$ BEGIN
    REVOKE ALL ON public.ai_requests FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DROP POLICY IF EXISTS "Allow public access for prototype" ON public.ai_requests;
DROP POLICY IF EXISTS "ai_requests_select" ON public.ai_requests;
DROP POLICY IF EXISTS "ai_requests_insert" ON public.ai_requests;
DROP POLICY IF EXISTS "ai_requests_update" ON public.ai_requests;
DROP POLICY IF EXISTS "ai_requests_delete" ON public.ai_requests;

CREATE POLICY "ai_requests_select" ON public.ai_requests 
FOR SELECT TO authenticated 
USING (
    student_id = auth.uid()::text 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role IN ('ADMIN', 'TEACHER'))
);

CREATE POLICY "ai_requests_insert" ON public.ai_requests 
FOR INSERT TO authenticated 
WITH CHECK (
    student_id = auth.uid()::text 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role IN ('ADMIN', 'TEACHER'))
);

CREATE POLICY "ai_requests_update" ON public.ai_requests 
FOR UPDATE TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role IN ('ADMIN', 'TEACHER'))
);

CREATE POLICY "ai_requests_delete" ON public.ai_requests 
FOR DELETE TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role IN ('ADMIN', 'TEACHER'))
);

-- 7. E-Learning: siết chặt RLS chapters & lessons (SEC-04)
DROP POLICY IF EXISTS "el_chapters_select" ON public.el_chapters;
CREATE POLICY "el_chapters_select" ON public.el_chapters FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "el_chapters_insert" ON public.el_chapters;
DROP POLICY IF EXISTS "el_chapters_update" ON public.el_chapters;
DROP POLICY IF EXISTS "el_chapters_delete" ON public.el_chapters;

CREATE POLICY "el_chapters_insert" ON public.el_chapters 
FOR INSERT TO authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.el_courses c
        WHERE c.id = course_id 
        AND (c.created_by = auth.uid()::text OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()::text AND p.role IN ('ADMIN', 'TEACHER')))
    )
);

CREATE POLICY "el_chapters_update" ON public.el_chapters 
FOR UPDATE TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.el_courses c
        WHERE c.id = course_id 
        AND (c.created_by = auth.uid()::text OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()::text AND p.role IN ('ADMIN', 'TEACHER')))
    )
);

CREATE POLICY "el_chapters_delete" ON public.el_chapters 
FOR DELETE TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.el_courses c
        WHERE c.id = course_id 
        AND (c.created_by = auth.uid()::text OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()::text AND p.role IN ('ADMIN', 'TEACHER')))
    )
);

DROP POLICY IF EXISTS "el_lessons_select" ON public.el_lessons;
CREATE POLICY "el_lessons_select" ON public.el_lessons FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "el_lessons_insert" ON public.el_lessons;
DROP POLICY IF EXISTS "el_lessons_update" ON public.el_lessons;
DROP POLICY IF EXISTS "el_lessons_delete" ON public.el_lessons;

CREATE POLICY "el_lessons_insert" ON public.el_lessons 
FOR INSERT TO authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.el_courses c
        WHERE c.id = course_id 
        AND (c.created_by = auth.uid()::text OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()::text AND p.role IN ('ADMIN', 'TEACHER')))
    )
);

CREATE POLICY "el_lessons_update" ON public.el_lessons 
FOR UPDATE TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.el_courses c
        WHERE c.id = course_id 
        AND (c.created_by = auth.uid()::text OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()::text AND p.role IN ('ADMIN', 'TEACHER')))
    )
);

CREATE POLICY "el_lessons_delete" ON public.el_lessons 
FOR DELETE TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.el_courses c
        WHERE c.id = course_id 
        AND (c.created_by = auth.uid()::text OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()::text AND p.role IN ('ADMIN', 'TEACHER')))
    )
);

-- 8. arena_profiles: cho phép cập nhật thông tin cá nhân/nhiệm vụ nhưng có trigger bảo vệ stats (BUG-01)
DROP POLICY IF EXISTS "Users can update own arena profile" ON public.arena_profiles;
CREATE POLICY "Users can update own arena profile"
ON public.arena_profiles FOR UPDATE
TO authenticated
USING (
    auth.uid()::text = id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role IN ('ADMIN', 'TEACHER'))
)
WITH CHECK (
    auth.uid()::text = id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role IN ('ADMIN', 'TEACHER'))
);


-- ─────────────────────────────────────────────────────────────────────────────
-- BƯỚC 4: HÀM STORED PROCEDURES & TRIGGERS BẢO VỆ
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Chống thăng quyền (Privilege Escalation trên profiles) (SEC-01)
CREATE OR REPLACE FUNCTION public.check_profile_role_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF current_user IN ('postgres', 'service_role') THEN
            RETURN NEW;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid()::text AND role = 'ADMIN'
        ) THEN
            RAISE EXCEPTION 'Từ chối quyền: Chỉ có Quản trị viên (ADMIN) mới có quyền sửa đổi trường vai trò (role).';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_profile_role_update ON public.profiles;
CREATE TRIGGER trg_check_profile_role_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.check_profile_role_update();

-- 2. Bảo vệ stats Arena (Elo, XP, Floor) chống can thiệp trực tiếp từ client (BUG-01)
CREATE OR REPLACE FUNCTION public.protect_arena_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF current_user IN ('postgres', 'service_role') THEN
        RETURN NEW;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role IN ('ADMIN', 'TEACHER')) THEN
        NEW.elo_rating := OLD.elo_rating;
        NEW.total_xp := OLD.total_xp;
        NEW.tower_floor := OLD.tower_floor;
        NEW.wins := OLD.wins;
        NEW.losses := OLD.losses;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_arena_profile_stats ON public.arena_profiles;
CREATE TRIGGER trg_protect_arena_profile_stats
BEFORE UPDATE ON public.arena_profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_arena_profile_stats();

-- 3. Hàm RPC increment_downloads
CREATE OR REPLACE FUNCTION public.increment_downloads(exam_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.exams 
    SET downloads = COALESCE(downloads, 0) + 1 
    WHERE id = exam_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Hàm tổng hợp Retention Policy E-Learning (BUG-03)
CREATE OR REPLACE FUNCTION public.aggregate_old_study_history()
RETURNS TEXT AS $$
DECLARE
  cutoff_date TIMESTAMPTZ;
  agg_count INTEGER;
  del_count INTEGER;
BEGIN
  cutoff_date := now() - INTERVAL '6 months';

  INSERT INTO public.el_study_history_monthly (
    student_id, course_id, month_year,
    total_sessions, total_study_time_sec, total_watch_time_sec,
    lessons_studied, avg_quiz_score
  )
  SELECT
    student_id,
    course_id,
    to_char(created_at, 'YYYY-MM') AS month_year,
    COUNT(*)::INTEGER AS total_sessions,
    COALESCE(SUM(time_spent), 0)::INTEGER AS total_study_time_sec,
    COALESCE(SUM(CASE WHEN action_type = 'VIDEO_WATCH' THEN time_spent ELSE 0 END), 0)::INTEGER AS total_watch_time_sec,
    ARRAY_AGG(DISTINCT lesson_id) AS lessons_studied,
    AVG(CASE WHEN action_type = 'QUIZ_ATTEMPT' THEN score ELSE NULL END)::REAL AS avg_quiz_score
  FROM public.el_study_history
  WHERE created_at < cutoff_date
  GROUP BY student_id, course_id, to_char(created_at, 'YYYY-MM')
  ON CONFLICT (student_id, course_id, month_year) DO UPDATE SET
    total_sessions = el_study_history_monthly.total_sessions + EXCLUDED.total_sessions,
    total_study_time_sec = el_study_history_monthly.total_study_time_sec + EXCLUDED.total_study_time_sec,
    total_watch_time_sec = el_study_history_monthly.total_watch_time_sec + EXCLUDED.total_watch_time_sec,
    lessons_studied = (
      SELECT ARRAY_AGG(DISTINCT x)
      FROM unnest(el_study_history_monthly.lessons_studied || EXCLUDED.lessons_studied) AS x
    ),
    avg_quiz_score = CASE
      WHEN EXCLUDED.avg_quiz_score IS NOT NULL
      THEN (COALESCE(el_study_history_monthly.avg_quiz_score, 0) + EXCLUDED.avg_quiz_score) / 2
      ELSE el_study_history_monthly.avg_quiz_score
    END;

  GET DIAGNOSTICS agg_count = ROW_COUNT;

  DELETE FROM public.el_study_history
  WHERE created_at < cutoff_date;

  GET DIAGNOSTICS del_count = ROW_COUNT;

  RETURN format('Aggregated %s monthly records and purged %s raw history records older than %s',
    agg_count, del_count, cutoff_date::DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─────────────────────────────────────────────────────────────────────────────
-- BƯỚC 5: BẢO VỆ REALTIME PUBLICATION AN TOÀN (SEC-07)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

DO $$
DECLARE
  tbl TEXT;
  tables_to_add TEXT[] := ARRAY[
    'attempts', 
    'notifications', 
    'arena_matches', 
    'arena_match_events', 
    'behavior_logs', 
    'attendance',
    'resources'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_to_add LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
      END IF;
    END IF;
  END LOOP;
END $$;
