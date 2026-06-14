-- ============================================
-- PORTFOLIO NOTES - Ghi chú GV bổ sung vào Hồ sơ HS
-- Chạy file này trong Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS public.portfolio_notes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general',
  -- Gợi ý: 'health' (sức khoẻ), 'family' (hoàn cảnh gia đình), 
  -- 'talent' (năng khiếu), 'external_award' (giải thưởng bên ngoài),
  -- 'concern' (vấn đề cần chú ý), 'general' (ghi chú chung)
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.portfolio_notes ENABLE ROW LEVEL SECURITY;

-- GV chỉ xem/sửa ghi chú của mình
CREATE POLICY "Teachers manage own notes" ON public.portfolio_notes
  FOR ALL USING (true) WITH CHECK (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_portfolio_notes_student ON public.portfolio_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_notes_teacher ON public.portfolio_notes(teacher_id);
