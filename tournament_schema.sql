-- ============================================
-- ARENA TOURNAMENT - Database Schema
-- Chạy file này trong Supabase SQL Editor
-- ============================================

-- 1. Bảng Tournament (Phòng Đấu Trường)
CREATE TABLE IF NOT EXISTS public.arena_tournaments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  teacher_id TEXT REFERENCES public.profiles(id),
  title TEXT NOT NULL DEFAULT 'Đấu Trường Tri Thức',
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting','active','finished')),
  question_source TEXT DEFAULT 'arena' CHECK (question_source IN ('arena','exam')),
  question_ids TEXT[] DEFAULT '{}',
  filter_subject TEXT,
  filter_grade TEXT,
  questions_per_match INT DEFAULT 5,
  time_per_question INT DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Bảng Người tham gia Tournament
CREATE TABLE IF NOT EXISTS public.arena_tournament_participants (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tournament_id TEXT REFERENCES public.arena_tournaments(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES public.profiles(id),
  alias TEXT NOT NULL,
  alias_emoji TEXT DEFAULT '🎭',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','fighting','eliminated','champion')),
  wins INT DEFAULT 0,
  current_match_id TEXT,
  eliminated_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tournament_id, student_id)
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.arena_tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read tournaments" ON public.arena_tournaments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teacher manage tournaments" ON public.arena_tournaments FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.arena_tournament_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read participants" ON public.arena_tournament_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage participants" ON public.arena_tournament_participants FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- REALTIME PUBLICATION
-- ============================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_tournaments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_tournament_participants;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
