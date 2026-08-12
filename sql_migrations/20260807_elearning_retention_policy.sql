-- ═══════════════════════════════════════════════════════════════
-- E-Learning: Data Retention Policy
-- Tổng hợp el_study_history cũ > 6 tháng thành monthly summaries
-- Chạy định kỳ (cron hoặc manual) để kiểm soát dung lượng Supabase
-- ═══════════════════════════════════════════════════════════════

-- Bảng tổng hợp monthly
CREATE TABLE IF NOT EXISTS public.el_study_history_monthly (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES public.el_courses(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,          -- 'YYYY-MM'
  total_sessions INTEGER DEFAULT 0,
  total_study_time_sec INTEGER DEFAULT 0,
  total_watch_time_sec INTEGER DEFAULT 0,
  lessons_studied TEXT[] DEFAULT '{}',  -- distinct lesson IDs
  avg_quiz_score REAL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint to allow upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_el_monthly_unique
  ON public.el_study_history_monthly(student_id, course_id, month_year);

-- RLS
ALTER TABLE public.el_study_history_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Monthly summary read for auth users"
  ON public.el_study_history_monthly
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Monthly summary insert for service"
  ON public.el_study_history_monthly
  FOR INSERT WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- Function: aggregate_old_study_history()
-- Tổng hợp records > 6 tháng vào bảng monthly, rồi xóa records cũ
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION aggregate_old_study_history()
RETURNS TEXT AS $$
DECLARE
  cutoff_date TIMESTAMPTZ;
  agg_count INTEGER;
  del_count INTEGER;
BEGIN
  cutoff_date := now() - INTERVAL '6 months';

  -- 1. Aggregate into monthly summaries
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
    COALESCE(SUM(study_time_sec), 0)::INTEGER AS total_study_time_sec,
    COALESCE(SUM(watch_time_sec), 0)::INTEGER AS total_watch_time_sec,
    ARRAY_AGG(DISTINCT lesson_id) AS lessons_studied,
    AVG(quiz_score)::REAL AS avg_quiz_score
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

  -- 2. Delete old raw records
  DELETE FROM public.el_study_history
  WHERE created_at < cutoff_date;

  GET DIAGNOSTICS del_count = ROW_COUNT;

  RETURN format('Aggregated %s monthly summaries, deleted %s raw records (cutoff: %s)',
    agg_count, del_count, cutoff_date::TEXT);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- Cách sử dụng:
--   SELECT aggregate_old_study_history();
--
-- Có thể đặt cron trong Supabase Dashboard > Database > Extensions:
--   SELECT cron.schedule('retention-cleanup', '0 3 1 * *',
--     $$SELECT aggregate_old_study_history()$$);
-- (Chạy lúc 3AM ngày 1 hàng tháng)
-- ═══════════════════════════════════════════════════════════════
