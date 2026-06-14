-- SCRIPT BỔ SUNG CỘT CATEGORY VÀ ĐỒNG BỘ HÓA BẢNG EXAMS
-- Chạy script này trong Supabase SQL Editor để sửa lỗi "Could not find the 'category' column"

DO $$ 
BEGIN 
    -- 1. Thêm cột category nếu chưa tồn tại
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'category') THEN
        ALTER TABLE public.exams ADD COLUMN category TEXT DEFAULT 'TASK';
    END IF;

    -- 2. Cập nhật dữ liệu cũ để phân loại đúng
    -- Giả định: các đề thi được tạo từ Ma trận có ID bắt đầu bằng 'exam_matrix_'
    UPDATE public.exams 
    SET category = 'EXAM' 
    WHERE id LIKE 'exam_matrix_%';

    UPDATE public.exams 
    SET category = 'TASK' 
    WHERE category IS NULL OR id NOT LIKE 'exam_matrix_%';

    -- 3. Đảm bảo các cột khác đã ở dạng snake_case (nếu script fix_database_schema.sql chưa chạy hết)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'durationMinutes') THEN
        ALTER TABLE public.exams RENAME COLUMN "durationMinutes" TO duration_minutes;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'questionCount') THEN
        ALTER TABLE public.exams RENAME COLUMN "questionCount" TO question_count;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'createdAt') THEN
        ALTER TABLE public.exams RENAME COLUMN "createdAt" TO created_at;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'classId') THEN
        ALTER TABLE public.exams RENAME COLUMN "classId" TO class_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'deletedAt') THEN
        ALTER TABLE public.exams RENAME COLUMN "deletedAt" TO deleted_at;
    END IF;

END $$;
