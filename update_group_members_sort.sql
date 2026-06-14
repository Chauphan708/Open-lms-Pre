-- Thêm cột sort_order vào bảng class_group_members để lưu thứ tự học sinh trong tổ
alter table public.class_group_members 
add column if not exists sort_order int default 0;

-- Cập nhật RLS nếu cần (thường đã có sẵn ở classfun_schema.sql)
-- Trình tự sắp xếp mặc định có thể là theo thời gian tạo ban đầu
