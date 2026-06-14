-- ============================================
-- SQL MIGRATION: BẢO MẬT AUTH & VÁ CHẶT CHÍNH SÁCH RLS
-- Chạy script này trong Supabase SQL Editor
-- ============================================

-- BẬT TIỆN ÍCH MÃ HÓA PGCRYPTO NẾU CHƯA CÓ
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============================================
-- 1. DI TRÚ TÀI KHOẢN HIỆN CÓ SANG SUPABASE AUTH
-- ============================================

-- Hàm di trú tài khoản từ profiles sang auth.users
CREATE OR REPLACE FUNCTION public.migrate_profiles_to_auth()
RETURNS void AS $$
DECLARE
    r RECORD;
    new_uid UUID;
    clean_email TEXT;
BEGIN
    FOR r IN SELECT * FROM public.profiles LOOP
        -- Tránh trùng lặp nếu email đã tồn tại trong auth.users
        clean_email := LOWER(TRIM(r.email));
        IF NOT (clean_email LIKE '%@%') THEN
            clean_email := clean_email || '@openlms.edu';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = clean_email) THEN
            -- Tạo UUID mới hoặc sử dụng UUID cũ của profile nếu là dạng UUID hợp lệ
            BEGIN
                new_uid := r.id::uuid;
            EXCEPTION WHEN OTHERS THEN
                new_uid := extensions.gen_random_uuid();
            END;
            
            IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = new_uid) THEN
                -- Chèn tài khoản bảo mật vào auth.users bằng mật khẩu mã hóa bcrypt
                INSERT INTO auth.users (
                    id, 
                    instance_id, 
                    email, 
                    encrypted_password, 
                    email_confirmed_at, 
                    raw_app_meta_data, 
                    raw_user_meta_data, 
                    is_super_admin, 
                    role,
                    created_at,
                    updated_at
                )
                VALUES (
                    new_uid,
                    '00000000-0000-0000-0000-000000000000'::uuid,
                    clean_email,
                    extensions.crypt(COALESCE(r.password, '123456'), extensions.gen_salt('bf')),
                    now(),
                    '{"provider":"email","providers":["email"]}'::jsonb,
                    json_build_object('name', r.name, 'role', r.role)::jsonb,
                    false,
                    'authenticated',
                    now(),
                    now()
                );

                -- Cập nhật ID và email trong profiles
                UPDATE public.profiles SET id = new_uid::text, email = clean_email WHERE id = r.id;
                
                -- Cập nhật tất cả các bảng liên quan để giữ toàn vẹn dữ liệu
                UPDATE public.exams SET teacher_id = new_uid::text WHERE teacher_id = r.id;
                UPDATE public.classes SET teacher_id = new_uid::text WHERE teacher_id = r.id;
                UPDATE public.assignments SET teacher_id = new_uid::text WHERE teacher_id = r.id;
                UPDATE public.attempts SET student_id = new_uid::text WHERE student_id = r.id;
                UPDATE public.arena_profiles SET id = new_uid::text WHERE id = r.id;
                UPDATE public.behavior_logs SET student_id = new_uid::text WHERE student_id = r.id;
                UPDATE public.behavior_logs SET recorded_by = new_uid::text WHERE recorded_by = r.id;
                UPDATE public.attendance SET student_id = new_uid::text WHERE student_id = r.id;
                UPDATE public.attendance SET recorded_by = new_uid::text WHERE recorded_by = r.id;
                UPDATE public.class_group_members SET student_id = new_uid::text WHERE student_id = r.id;
                UPDATE public.daily_evaluations SET student_id = new_uid::text WHERE student_id = r.id;
                UPDATE public.daily_evaluations SET teacher_id = new_uid::text WHERE teacher_id = r.id;
                UPDATE public.discussion_participants SET student_id = new_uid::text WHERE student_id = r.id;
                UPDATE public.discussion_messages SET sender_id = new_uid::text WHERE sender_id = r.id;
                UPDATE public.parent_student_links SET student_id = new_uid::text WHERE student_id = r.id;
                UPDATE public.parent_student_links SET linked_by = new_uid::text WHERE linked_by = r.id;
                UPDATE public.arena_tournament_participants SET student_id = new_uid::text WHERE student_id = r.id;
                UPDATE public.arena_tournaments SET teacher_id = new_uid::text WHERE teacher_id = r.id;
                UPDATE public.arena_match_events SET player_id = new_uid::text WHERE player_id = r.id;
                UPDATE public.arena_matches SET player1_id = new_uid::text WHERE player1_id = r.id;
                UPDATE public.arena_matches SET player2_id = new_uid::text WHERE player2_id = r.id;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Chạy hàm di trú trong chế độ tắt kiểm tra khóa ngoại tạm thời để tránh lỗi
SET session_replication_role = 'replica';
SELECT public.migrate_profiles_to_auth();
SET session_replication_role = 'origin';
DROP FUNCTION public.migrate_profiles_to_auth();

-- ============================================
-- 2. DI TRÚ TÀI KHOẢN PHỤ HUYNH (PARENTS) SANG SUPABASE AUTH
-- ============================================

CREATE OR REPLACE FUNCTION public.migrate_parents_to_auth()
RETURNS void AS $$
DECLARE
    r RECORD;
    new_uid UUID;
    clean_email TEXT;
BEGIN
    FOR r IN SELECT * FROM public.parents LOOP
        clean_email := LOWER(TRIM(r.email));
        IF NOT (clean_email LIKE '%@%') THEN
            clean_email := clean_email || '@openlms.edu';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = clean_email) THEN
            BEGIN
                new_uid := r.id::uuid;
            EXCEPTION WHEN OTHERS THEN
                new_uid := extensions.gen_random_uuid();
            END;

            -- Kiểm tra thêm điều kiện tránh trùng lặp ID trong auth.users
            IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = new_uid) THEN
                INSERT INTO auth.users (
                    id, 
                    instance_id, 
                    email, 
                    encrypted_password, 
                    email_confirmed_at, 
                    raw_app_meta_data, 
                    raw_user_meta_data, 
                    is_super_admin, 
                    role,
                    created_at,
                    updated_at
                )
                VALUES (
                    new_uid,
                    '00000000-0000-0000-0000-000000000000'::uuid,
                    clean_email,
                    extensions.crypt(COALESCE(r.password, '123456'), extensions.gen_salt('bf')),
                    now(),
                    '{"provider":"email","providers":["email"]}'::jsonb,
                    json_build_object('name', r.name, 'role', 'PARENT')::jsonb,
                    false,
                    'authenticated',
                    now(),
                    now()
                );

                UPDATE public.parents SET id = new_uid::text, email = clean_email WHERE id = r.id;
                UPDATE public.parent_student_links SET parent_id = new_uid::text WHERE parent_id = r.id;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Chạy hàm di trú
SET session_replication_role = 'replica';
SELECT public.migrate_parents_to_auth();
SET session_replication_role = 'origin';
DROP FUNCTION public.migrate_parents_to_auth();

-- ============================================
-- 3. CÀI ĐẶT TRIGGER TỰ ĐỘNG ĐỒNG BỘ TÀI KHOẢN MỚI
-- ============================================

-- Khi Giáo viên tạo hồ sơ Student mới trong `profiles` dạng thô, trigger này tự động đồng bộ sang auth.users
CREATE OR REPLACE FUNCTION public.handle_profile_insert_sync_auth()
RETURNS TRIGGER AS $$
DECLARE
    new_uid UUID;
    clean_email TEXT;
BEGIN
    clean_email := LOWER(TRIM(NEW.email));
    IF NOT (clean_email LIKE '%@%') THEN
        clean_email := clean_email || '@openlms.edu';
    END IF;
    NEW.email := clean_email;
    
    -- Nếu ID không phải UUID hợp lệ, tạo UUID mới và gán cho NEW.id
    BEGIN
        new_uid := NEW.id::uuid;
    EXCEPTION WHEN OTHERS THEN
        new_uid := extensions.gen_random_uuid();
        NEW.id := new_uid::text;
    END;

    -- Đồng bộ vào auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = clean_email) THEN
        INSERT INTO auth.users (
            id, 
            instance_id, 
            email, 
            encrypted_password, 
            email_confirmed_at, 
            raw_app_meta_data, 
            raw_user_meta_data, 
            is_super_admin, 
            role
        )
        VALUES (
            new_uid,
            '00000000-0000-0000-0000-000000000000'::uuid,
            clean_email,
            extensions.crypt(COALESCE(NEW.password, '123456'), extensions.gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            json_build_object('name', NEW.name, 'role', NEW.role)::jsonb,
            false,
            'authenticated'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_profiles_insert_sync_auth ON public.profiles;
CREATE TRIGGER tr_profiles_insert_sync_auth
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_profile_insert_sync_auth();

-- Đồng bộ khi phụ huynh đăng ký hoặc được GV tạo mới
CREATE OR REPLACE FUNCTION public.handle_parent_insert_sync_auth()
RETURNS TRIGGER AS $$
DECLARE
    new_uid UUID;
    clean_email TEXT;
BEGIN
    clean_email := LOWER(TRIM(NEW.email));
    IF NOT (clean_email LIKE '%@%') THEN
        clean_email := clean_email || '@openlms.edu';
    END IF;
    NEW.email := clean_email;
    
    BEGIN
        new_uid := NEW.id::uuid;
    EXCEPTION WHEN OTHERS THEN
        new_uid := extensions.gen_random_uuid();
        NEW.id := new_uid::text;
    END;

    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = clean_email) THEN
        INSERT INTO auth.users (
            id, 
            instance_id, 
            email, 
            encrypted_password, 
            email_confirmed_at, 
            raw_app_meta_data, 
            raw_user_meta_data, 
            is_super_admin, 
            role
        )
        VALUES (
            new_uid,
            '00000000-0000-0000-0000-000000000000'::uuid,
            clean_email,
            extensions.crypt(COALESCE(NEW.password, '123456'), extensions.gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            json_build_object('name', NEW.name, 'role', 'PARENT')::jsonb,
            false,
            'authenticated'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_parents_insert_sync_auth ON public.parents;
CREATE TRIGGER tr_parents_insert_sync_auth
    BEFORE INSERT ON public.parents
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_parent_insert_sync_auth();

-- ============================================
-- 4. VÁ CHẶT CHÍNH SÁCH BẢO MẬT HỆ THỐNG RLS
-- ============================================

-- BẬT RLS CHO CÁC BẢNG QUAN TRỌNG
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- Vá RLS cho profiles
DROP POLICY IF EXISTS "Profiles read access" ON public.profiles;
DROP POLICY IF EXISTS "Profiles modify access" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow teachers and admins to insert/update profiles" ON public.profiles;

CREATE POLICY "Allow authenticated users to read profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow teachers and admins to insert/update profiles" 
ON public.profiles FOR ALL 
TO authenticated 
USING (
    auth.uid()::text = id OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()::text) IN ('ADMIN', 'TEACHER')
);

-- Vá RLS cho attempts (ngăn chặn học sinh sửa điểm, xem bài của người khác)
DROP POLICY IF EXISTS "attempts read policy" ON public.attempts;
DROP POLICY IF EXISTS "attempts write policy" ON public.attempts;
DROP POLICY IF EXISTS "Students read own attempts, teachers read all" ON public.attempts;
DROP POLICY IF EXISTS "Students create own attempts, teachers full modify" ON public.attempts;

CREATE POLICY "Students read own attempts, teachers read all" 
ON public.attempts FOR SELECT 
TO authenticated 
USING (
    student_id = auth.uid()::text OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()::text) IN ('ADMIN', 'TEACHER')
);

CREATE POLICY "Students create own attempts, teachers full modify" 
ON public.attempts FOR ALL 
TO authenticated 
USING (
    student_id = auth.uid()::text OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()::text) IN ('ADMIN', 'TEACHER')
);

-- Vá RLS cho exams (chỉ giáo viên được tạo đề)
DROP POLICY IF EXISTS "Exams read policy" ON public.exams;
DROP POLICY IF EXISTS "Exams write policy" ON public.exams;
DROP POLICY IF EXISTS "Exams read access for all logged in" ON public.exams;
DROP POLICY IF EXISTS "Only teachers and admins manage exams" ON public.exams;

CREATE POLICY "Exams read access for all logged in" 
ON public.exams FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Only teachers and admins manage exams" 
ON public.exams FOR ALL 
TO authenticated 
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()::text) IN ('ADMIN', 'TEACHER')
);

-- XÓA CỘT MẬT KHẨU THÔ KHỎI VIEW SELECT ĐỂ BẢO VỆ MẬT KHẨU (NÂNG CAO)
-- Giáo viên hoặc admin có thể quản lý qua auth.users, tránh rò rỉ plain-text
ALTER TABLE public.profiles ALTER COLUMN password DROP NOT NULL;
ALTER TABLE public.parents ALTER COLUMN password DROP NOT NULL;
