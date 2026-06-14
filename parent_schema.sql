-- ============================================
-- PHÂN HỆ PHỤ HUYNH HỌC SINH (PHHS) SCHEMA
-- ============================================

-- 1. Bảng tài khoản phụ huynh
CREATE TABLE IF NOT EXISTS public.parents (
  id text PRIMARY KEY,
  name text NOT NULL,
  phone text,
  email text,
  password text, -- Lưu mật khẩu dạng raw (để demo) hoặc hash nếu có server
  link_code text UNIQUE, -- Mã 6 ký tự ngẫu nhiên
  created_at timestamptz DEFAULT now()
);

-- 2. Bảng liên kết Phụ huynh ↔ Học sinh
-- Một phụ huynh có thể liên kết với nhiều học sinh (con)
CREATE TABLE IF NOT EXISTS public.parent_student_links (
  id text PRIMARY KEY,
  parent_id text REFERENCES public.parents(id) ON DELETE CASCADE,
  student_id text REFERENCES public.profiles(id) ON DELETE CASCADE,
  linked_by text REFERENCES public.profiles(id) ON DELETE SET NULL, -- Giáo viên nào đã tạo liên kết (hoặc sinh mã)
  created_at timestamptz DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

-- Bật RLS
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

-- Policies tạm thời (cho phép đọc/ghi từ client trong phiên bản demo)
CREATE POLICY "Public access to parents" ON public.parents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access to parent_student_links" ON public.parent_student_links FOR ALL USING (true) WITH CHECK (true);

-- Bật Realtime
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_parent_realtime;
  CREATE PUBLICATION supabase_parent_realtime;
COMMIT;
ALTER PUBLICATION supabase_parent_realtime ADD TABLE public.parents;
ALTER PUBLICATION supabase_parent_realtime ADD TABLE public.parent_student_links;
