-- SCRIPT ĐỒNG BỘ HÓA DATABASE SANG CHUẨN SNAKE_CASE
-- Chạy script này trong Supabase SQL Editor để sửa lỗi "Could not find the 'assignment_id' column"

-- 1. Bảng attempts
DO $$ 
BEGIN 
    -- Đổi tên các cột cũ nếu tồn tại
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attempts' AND column_name = 'examId') THEN
        ALTER TABLE public.attempts RENAME COLUMN "examId" TO exam_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attempts' AND column_name = 'assignmentId') THEN
        ALTER TABLE public.attempts RENAME COLUMN "assignmentId" TO assignment_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attempts' AND column_name = 'studentId') THEN
        ALTER TABLE public.attempts RENAME COLUMN "studentId" TO student_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attempts' AND column_name = 'submittedAt') THEN
        ALTER TABLE public.attempts RENAME COLUMN "submittedAt" TO submitted_at;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attempts' AND column_name = 'teacherFeedback') THEN
        ALTER TABLE public.attempts RENAME COLUMN "teacherFeedback" TO teacher_feedback;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attempts' AND column_name = 'feedbackAllowViewSolution') THEN
        ALTER TABLE public.attempts RENAME COLUMN "feedbackAllowViewSolution" TO feedback_allow_view_solution;
    END IF;

    -- Đảm bảo các cột mới cũng tồn tại (đề phòng)
    ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS total_time_spent_sec INTEGER;
    ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS time_spent_per_question JSONB;
    ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS cheat_warnings INTEGER;
END $$;

-- 2. Bảng assignments
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'examId') THEN
        ALTER TABLE public.assignments RENAME COLUMN "examId" TO exam_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'classId') THEN
        ALTER TABLE public.assignments RENAME COLUMN "classId" TO class_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'teacherId') THEN
        ALTER TABLE public.assignments RENAME COLUMN "teacherId" TO teacher_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'durationMinutes') THEN
        ALTER TABLE public.assignments RENAME COLUMN "durationMinutes" TO duration_minutes;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'startTime') THEN
        ALTER TABLE public.assignments RENAME COLUMN "startTime" TO start_time;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'endTime') THEN
        ALTER TABLE public.assignments RENAME COLUMN "endTime" TO end_time;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'studentIds') THEN
        ALTER TABLE public.assignments RENAME COLUMN "studentIds" TO student_ids;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'createdAt') THEN
        ALTER TABLE public.assignments RENAME COLUMN "createdAt" TO created_at;
    END IF;
END $$;

-- 3. Bảng profiles
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'className') THEN
        ALTER TABLE public.profiles RENAME COLUMN "className" TO class_name;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'savedPrompts') THEN
        ALTER TABLE public.profiles RENAME COLUMN "savedPrompts" TO saved_prompts;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'customTools') THEN
        ALTER TABLE public.profiles RENAME COLUMN "customTools" TO custom_tools;
    END IF;
END $$;

-- 4. Bảng exams
DO $$ 
BEGIN 
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

-- 5. Bảng classes (nếu thiếu)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'academicYearId') THEN
        ALTER TABLE public.classes RENAME COLUMN "academicYearId" TO academic_year_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'teacherId') THEN
        ALTER TABLE public.classes RENAME COLUMN "teacherId" TO teacher_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'studentIds') THEN
        ALTER TABLE public.classes RENAME COLUMN "studentIds" TO student_ids;
    END IF;
END $$;

-- 6. Bảng notifications
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'userId') THEN
        ALTER TABLE public.notifications RENAME COLUMN "userId" TO user_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'isRead') THEN
        ALTER TABLE public.notifications RENAME COLUMN "isRead" TO is_read;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'createdAt') THEN
        ALTER TABLE public.notifications RENAME COLUMN "createdAt" TO created_at;
    END IF;
END $$;
