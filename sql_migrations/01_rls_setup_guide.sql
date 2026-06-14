-- =====================================================================
-- HƯỚNG DẪN THIẾT LẬP BẢO MẬT RLS (ROW LEVEL SECURITY)
-- LƯU Ý QUAN TRỌNG: 
-- Script này sử dụng `auth.uid()`, nghĩa là NGƯỜI DÙNG BẮT BUỘC PHẢI
-- ĐĂNG NHẬP QUA SUPABASE AUTH thực sự (không dùng bypass bằng ID như 
-- 'admin1', 'teacher1' trên Frontend hiện tại).
-- Nếu bạn chạy script này khi các user cũ (ID dạng text không phải UUID)
-- thì hệ thống sẽ KHÓA TẤT CẢ QUYỀN TRUY CẬP của họ.
-- =====================================================================

-- 1. Bảng Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Mọi người có thể đọc profile của người khác (để hiển thị tên, lớp, v.v.)
CREATE POLICY "Cho phép đọc profiles" ON public.profiles FOR SELECT USING (true);
-- Chỉ chính người dùng đó hoặc Admin mới được cập nhật profile
CREATE POLICY "Chỉ tài khoản chính nó được sửa profile" ON public.profiles FOR UPDATE USING (auth.uid()::text = id OR (SELECT role FROM profiles WHERE id = auth.uid()::text) = 'ADMIN');

-- 2. Bảng Exams
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- Cả GV và HS đều có thể xem đề thi (HS cần xem phân công, thuật toán phân công xử lý ở Code)
CREATE POLICY "Cho phép xem đề thi" ON public.exams FOR SELECT USING (true);
-- Chỉ Giáo viên tạo ra đề thi mới được quyền sửa/xóa/thêm
CREATE POLICY "Chỉ giáo viên tạo mới được thao tác đề" ON public.exams FOR ALL USING (teacher_id = auth.uid()::text);

-- 3. Bảng Attempts (Bài nộp)
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;

-- Học sinh tự xem bài của mình, giáo viên xem bài của học sinh lớp mình
CREATE POLICY "Quyền xem bài làm" ON public.attempts FOR SELECT USING (
    student_id = auth.uid()::text 
    OR 
    (SELECT role FROM profiles WHERE id = auth.uid()::text) IN ('ADMIN', 'TEACHER')
);

-- Học sinh mới được phép nộp bài của chính mình
CREATE POLICY "Học sinh chỉ được nộp bài của chính mình" ON public.attempts FOR INSERT WITH CHECK (student_id = auth.uid()::text);
-- Giáo viên có thể chấm điểm (Update) bài nộp của học sinh
CREATE POLICY "Giáo viên chấm điểm bài nộp" ON public.attempts FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()::text) IN ('ADMIN', 'TEACHER')
);

-- 4. Bảng Classes
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Mọi người đều có thể list lớp học
CREATE POLICY "Xem lớp học" ON public.classes FOR SELECT USING (true);
-- Chỉ có Teacher/Admin mới được quyền tạo, sửa, xoá
CREATE POLICY "Quản lý lớp học" ON public.classes FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()::text) IN ('ADMIN', 'TEACHER')
);
