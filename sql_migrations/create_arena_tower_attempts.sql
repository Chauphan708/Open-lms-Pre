-- Tạo bảng lưu lịch sử chơi Leo tháp
CREATE TABLE IF NOT EXISTS public.arena_tower_attempts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT 'math',
  topic TEXT NOT NULL,
  grade TEXT NOT NULL,
  xp_gained INT DEFAULT 0,
  elo_change INT DEFAULT 0,
  end_floor INT DEFAULT 1,
  is_victory BOOLEAN DEFAULT FALSE,
  correct_answers INT DEFAULT 0,
  total_questions INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Kích hoạt RLS
ALTER TABLE public.arena_tower_attempts ENABLE ROW LEVEL SECURITY;

-- Cấp quyền đọc cho tất cả người dùng authenticated
DROP POLICY IF EXISTS "Authenticated users read tower attempts" ON public.arena_tower_attempts;
CREATE POLICY "Authenticated users read tower attempts" 
  ON public.arena_tower_attempts FOR SELECT TO authenticated USING (true);

-- Cấp quyền viết cho bản thân học sinh
DROP POLICY IF EXISTS "Students insert own attempts" ON public.arena_tower_attempts;
CREATE POLICY "Students insert own attempts" 
  ON public.arena_tower_attempts FOR INSERT TO authenticated 
  WITH CHECK (auth.uid()::text = student_id);

-- Thêm vào Supabase Realtime
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_tower_attempts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
