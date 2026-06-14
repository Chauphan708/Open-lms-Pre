-- =====================================================================
-- BẢN VÁ BẢO MẬT NÂNG CAO RLS CHO BEHAVIOR_LOGS VÀ ATTENDANCE
-- Chạy script này trong Supabase SQL Editor
-- =====================================================================

-- 1. Bảng Nhận xét hành vi (behavior_logs)
ALTER TABLE public.behavior_logs ENABLE ROW LEVEL SECURITY;

-- Xóa chính sách cũ nếu tồn tại
DROP POLICY IF EXISTS "Allow teachers and admins full access to behavior_logs" ON public.behavior_logs;
DROP POLICY IF EXISTS "Allow students to view own behavior_logs" ON public.behavior_logs;
DROP POLICY IF EXISTS "Allow parents to view linked student behavior_logs" ON public.behavior_logs;

-- Giáo viên và Admin có toàn quyền quản lý, ghi nhận nhận xét hành vi
CREATE POLICY "Allow teachers and admins full access to behavior_logs"
ON public.behavior_logs FOR ALL
TO authenticated
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()::text) IN ('ADMIN', 'TEACHER')
);

-- Học sinh chỉ được phép tự xem nhận xét hành vi của chính mình
CREATE POLICY "Allow students to view own behavior_logs"
ON public.behavior_logs FOR SELECT
TO authenticated
USING (
    student_id = auth.uid()::text
);

-- Phụ huynh chỉ được xem nhận xét hành vi của học sinh được liên kết
CREATE POLICY "Allow parents to view linked student behavior_logs"
ON public.behavior_logs FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.parent_student_links 
        WHERE parent_id = auth.uid()::text AND student_id = behavior_logs.student_id
    )
);


-- 2. Bảng Điểm danh chuyên cần (attendance)
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Xóa chính sách cũ nếu tồn tại
DROP POLICY IF EXISTS "Allow teachers and admins full access to attendance" ON public.attendance;
DROP POLICY IF EXISTS "Allow students to view own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Allow parents to view linked student attendance" ON public.attendance;

-- Giáo viên và Admin có toàn quyền quản lý và điểm danh
CREATE POLICY "Allow teachers and admins full access to attendance"
ON public.attendance FOR ALL
TO authenticated
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()::text) IN ('ADMIN', 'TEACHER')
);

-- Học sinh chỉ được phép xem thông tin điểm danh của chính mình
CREATE POLICY "Allow students to view own attendance"
ON public.attendance FOR SELECT
TO authenticated
USING (
    student_id = auth.uid()::text
);

-- Phụ huynh chỉ được xem thông tin điểm danh của học sinh được liên kết
CREATE POLICY "Allow parents to view linked student attendance"
ON public.attendance FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.parent_student_links 
        WHERE parent_id = auth.uid()::text AND student_id = attendance.student_id
    )
);
