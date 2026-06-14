-- Thêm cột thời gian đăng nhập cuối để xác định trạng thái kích hoạt
ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
