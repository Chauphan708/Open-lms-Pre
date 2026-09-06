-- =================================================================================
-- OPENLMS - SECURITY & ROW LEVEL SECURITY (RLS) HARDENING MASTER MIGRATION
-- Chạy script này trong Supabase SQL Editor để khóa chặt các lỗ hổng phân quyền dữ liệu.
-- =================================================================================

-- 1. BẢO MẬT BẢNG TÀI KHOẢN PHỤ HUYNH (public.parents)
ALTER TABLE IF EXISTS public.parents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to parents" ON public.parents;
DROP POLICY IF EXISTS "Parents read own profile" ON public.parents;
DROP POLICY IF EXISTS "Parents insert profile" ON public.parents;
DROP POLICY IF EXISTS "Parents update own profile" ON public.parents;

-- Cho phép đọc: Phụ huynh đọc hồ sơ của chính mình, Giáo viên/Admin đọc để phối hợp
CREATE POLICY "Parents read own profile"
  ON public.parents FOR SELECT
  TO authenticated
  USING (
    auth.uid()::text = id 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid()::text AND role IN ('ADMIN', 'TEACHER')
    )
  );

-- Cho phép đăng ký mới (INSERT tài khoản phụ huynh)
CREATE POLICY "Parents insert profile"
  ON public.parents FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Phụ huynh chỉ sửa hồ sơ của chính mình, Admin quản trị
CREATE POLICY "Parents update own profile"
  ON public.parents FOR UPDATE
  TO authenticated
  USING (
    auth.uid()::text = id 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  )
  WITH CHECK (
    auth.uid()::text = id 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- 2. BẢO MẬT LIÊN KẾT PHỤ HUYNH ↔ HỌC SINH (public.parent_student_links)
ALTER TABLE IF EXISTS public.parent_student_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to parent_student_links" ON public.parent_student_links;
DROP POLICY IF EXISTS "Authenticated read parent_student_links" ON public.parent_student_links;
DROP POLICY IF EXISTS "Teachers and parents manage links" ON public.parent_student_links;

CREATE POLICY "Authenticated read parent_student_links"
  ON public.parent_student_links FOR SELECT
  TO authenticated
  USING (
    parent_id = auth.uid()::text
    OR student_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid()::text AND role IN ('ADMIN', 'TEACHER')
    )
  );

CREATE POLICY "Teachers and parents manage links"
  ON public.parent_student_links FOR ALL
  TO authenticated
  USING (
    parent_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid()::text AND role IN ('ADMIN', 'TEACHER')
    )
  )
  WITH CHECK (
    parent_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid()::text AND role IN ('ADMIN', 'TEACHER')
    )
  );

-- 3. BẢO MẬT GHI CHÚ HỒ SƠ HỌC SINH (public.portfolio_notes)
ALTER TABLE IF EXISTS public.portfolio_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teachers manage own notes" ON public.portfolio_notes;
DROP POLICY IF EXISTS "Teachers read portfolio notes" ON public.portfolio_notes;
DROP POLICY IF EXISTS "Teachers insert portfolio notes" ON public.portfolio_notes;
DROP POLICY IF EXISTS "Teachers update portfolio notes" ON public.portfolio_notes;
DROP POLICY IF EXISTS "Teachers delete portfolio notes" ON public.portfolio_notes;

CREATE POLICY "Teachers read portfolio notes"
  ON public.portfolio_notes FOR SELECT
  TO authenticated
  USING (
    teacher_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );

CREATE POLICY "Teachers insert portfolio notes"
  ON public.portfolio_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid()::text = teacher_id
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid()::text AND role IN ('TEACHER', 'ADMIN')
    )
  );

CREATE POLICY "Teachers update portfolio notes"
  ON public.portfolio_notes FOR UPDATE
  TO authenticated
  USING (
    teacher_id = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = 'ADMIN')
  )
  WITH CHECK (
    teacher_id = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = 'ADMIN')
  );

CREATE POLICY "Teachers delete portfolio notes"
  ON public.portfolio_notes FOR DELETE
  TO authenticated
  USING (
    teacher_id = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND role = 'ADMIN')
  );

-- 4. BẢO MẬT CHIA SẺ HỒ SƠ (public.portfolio_shares)
ALTER TABLE IF EXISTS public.portfolio_shares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read portfolio shares" ON public.portfolio_shares;
DROP POLICY IF EXISTS "Manage portfolio shares" ON public.portfolio_shares;

CREATE POLICY "Read portfolio shares"
  ON public.portfolio_shares FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()::text
    OR shared_by = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid()::text AND role IN ('ADMIN', 'TEACHER')
    )
    OR EXISTS (
      SELECT 1 FROM public.parent_student_links
      WHERE parent_id = auth.uid()::text AND student_id = portfolio_shares.student_id
    )
  );

CREATE POLICY "Manage portfolio shares"
  ON public.portfolio_shares FOR ALL
  TO authenticated
  USING (
    shared_by = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid()::text AND role IN ('ADMIN', 'TEACHER')
    )
  )
  WITH CHECK (
    shared_by = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid()::text AND role IN ('ADMIN', 'TEACHER')
    )
  );

-- 5. BẢO MẬT ĐIỂM NỀ NẾP & ĐIỂM DANH (ClassFun behavior_logs & attendance)
DROP POLICY IF EXISTS "Teacher full access" ON public.behavior_logs;
DROP POLICY IF EXISTS "Teacher full access" ON public.attendance;
DROP POLICY IF EXISTS "Authenticated read behavior_logs" ON public.behavior_logs;
DROP POLICY IF EXISTS "Teachers manage behavior_logs" ON public.behavior_logs;
DROP POLICY IF EXISTS "Authenticated read attendance" ON public.attendance;
DROP POLICY IF EXISTS "Teachers manage attendance" ON public.attendance;

-- Điểm nề nếp
CREATE POLICY "Authenticated read behavior_logs"
  ON public.behavior_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers manage behavior_logs"
  ON public.behavior_logs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid()::text AND role IN ('ADMIN', 'TEACHER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid()::text AND role IN ('ADMIN', 'TEACHER')
    )
  );

-- Điểm danh
CREATE POLICY "Authenticated read attendance"
  ON public.attendance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers manage attendance"
  ON public.attendance FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid()::text AND role IN ('ADMIN', 'TEACHER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid()::text AND role IN ('ADMIN', 'TEACHER')
    )
  );

-- 6. TỐI ƯU HÓA INDEXES CHO BẢO MẬT & TRUY VẤN
CREATE INDEX IF NOT EXISTS idx_parent_student_links_parent ON public.parent_student_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_links_student ON public.parent_student_links(student_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_notes_teacher ON public.portfolio_notes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_notes_student ON public.portfolio_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_shares_student ON public.portfolio_shares(student_id);
