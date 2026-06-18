-- =========================================================================
-- SQL MIGRATION: FIX SYNCHRONIZATION TRIGGERS AND MISSING IDENTITIES
-- Run this script in the Supabase SQL Editor to allow teachers/admins 
-- to create students and parents, update passwords/emails, and log in.
-- =========================================================================

-- 1. Redefine handle_profile_insert_sync_auth to insert into auth.users and auth.identities
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
    
    -- Parse ID to UUID, fallback to new UUID
    BEGIN
        new_uid := NEW.id::uuid;
    EXCEPTION WHEN OTHERS THEN
        new_uid := extensions.gen_random_uuid();
        NEW.id := new_uid::text;
    END;

    -- Sync to auth.users
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
            role,
            aud,
            created_at,
            updated_at
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
            'authenticated',
            'authenticated',
            now(),
            now()
        );
    END IF;

    -- Sync to auth.identities (Absolutely required for Supabase Auth login)
    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = new_uid) THEN
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        )
        VALUES (
            new_uid,
            new_uid,
            json_build_object('sub', new_uid::text, 'email', clean_email)::jsonb,
            'email',
            new_uid::text,
            now(),
            now(),
            now()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Redefine handle_parent_insert_sync_auth to insert into auth.users and auth.identities
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

    -- Sync to auth.users
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
            role,
            aud,
            created_at,
            updated_at
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
            'authenticated',
            'authenticated',
            now(),
            now()
        );
    END IF;

    -- Sync to auth.identities (Absolutely required for Supabase Auth login)
    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = new_uid) THEN
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        )
        VALUES (
            new_uid,
            new_uid,
            json_build_object('sub', new_uid::text, 'email', clean_email)::jsonb,
            'email',
            new_uid::text,
            now(),
            now(),
            now()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Define UPDATE triggers to sync profile and parent updates to auth.users & auth.identities
CREATE OR REPLACE FUNCTION public.handle_profile_update_sync_auth()
RETURNS TRIGGER AS $$
DECLARE
    clean_email TEXT;
BEGIN
    clean_email := LOWER(TRIM(NEW.email));
    IF NOT (clean_email LIKE '%@%') THEN
        clean_email := clean_email || '@openlms.edu';
    END IF;
    NEW.email := clean_email;

    -- Sync updates to auth.users
    UPDATE auth.users
    SET 
        email = clean_email,
        encrypted_password = CASE 
            WHEN NEW.password IS DISTINCT FROM OLD.password AND NEW.password IS NOT NULL AND NEW.password <> '' THEN extensions.crypt(NEW.password, extensions.gen_salt('bf'))
            ELSE encrypted_password 
        END,
        raw_user_meta_data = json_build_object('name', NEW.name, 'role', NEW.role)::jsonb,
        updated_at = now()
    WHERE id = NEW.id::uuid;

    -- Sync updates to auth.identities
    UPDATE auth.identities
    SET 
        identity_data = json_build_object('sub', NEW.id, 'email', clean_email)::jsonb,
        updated_at = now()
    WHERE user_id = NEW.id::uuid AND provider = 'email';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_profiles_update_sync_auth ON public.profiles;
CREATE TRIGGER tr_profiles_update_sync_auth
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    WHEN (NEW.password IS DISTINCT FROM OLD.password OR NEW.email IS DISTINCT FROM OLD.email OR NEW.name IS DISTINCT FROM OLD.name OR NEW.role IS DISTINCT FROM OLD.role)
    EXECUTE FUNCTION public.handle_profile_update_sync_auth();


CREATE OR REPLACE FUNCTION public.handle_parent_update_sync_auth()
RETURNS TRIGGER AS $$
DECLARE
    clean_email TEXT;
BEGIN
    clean_email := LOWER(TRIM(NEW.email));
    IF NOT (clean_email LIKE '%@%') THEN
        clean_email := clean_email || '@openlms.edu';
    END IF;
    NEW.email := clean_email;

    -- Sync updates to auth.users
    UPDATE auth.users
    SET 
        email = clean_email,
        encrypted_password = CASE 
            WHEN NEW.password IS DISTINCT FROM OLD.password AND NEW.password IS NOT NULL AND NEW.password <> '' THEN extensions.crypt(NEW.password, extensions.gen_salt('bf'))
            ELSE encrypted_password 
        END,
        raw_user_meta_data = json_build_object('name', NEW.name, 'role', 'PARENT')::jsonb,
        updated_at = now()
    WHERE id = NEW.id::uuid;

    -- Sync updates to auth.identities
    UPDATE auth.identities
    SET 
        identity_data = json_build_object('sub', NEW.id, 'email', clean_email)::jsonb,
        updated_at = now()
    WHERE user_id = NEW.id::uuid AND provider = 'email';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_parents_update_sync_auth ON public.parents;
CREATE TRIGGER tr_parents_update_sync_auth
    BEFORE UPDATE ON public.parents
    FOR EACH ROW
    WHEN (NEW.password IS DISTINCT FROM OLD.password OR NEW.email IS DISTINCT FROM OLD.email OR NEW.name IS DISTINCT FROM OLD.name)
    EXECUTE FUNCTION public.handle_parent_update_sync_auth();

-- 4. Run migration to fix existing users in auth.users missing identities
DO $$
DECLARE
    u RECORD;
BEGIN
    FOR u IN SELECT id, email FROM auth.users LOOP
        IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = u.id) THEN
            INSERT INTO auth.identities (
                id,
                user_id,
                identity_data,
                provider,
                provider_id,
                last_sign_in_at,
                created_at,
                updated_at
            )
            VALUES (
                u.id,
                u.id,
                json_build_object('sub', u.id::text, 'email', u.email)::jsonb,
                'email',
                u.id::text,
                now(),
                now(),
                now()
            );
        END IF;
    END LOOP;
END $$;

-- 5. Sync existing/updated passwords from profiles and parents to auth.users
UPDATE auth.users u
SET encrypted_password = extensions.crypt(p.password, extensions.gen_salt('bf'))
FROM public.profiles p
WHERE u.id = p.id::uuid AND p.password IS NOT NULL AND p.password <> '';

UPDATE auth.users u
SET encrypted_password = extensions.crypt(p.password, extensions.gen_salt('bf'))
FROM public.parents p
WHERE u.id = p.id::uuid AND p.password IS NOT NULL AND p.password <> '';

-- 6. Ensure all users have confirmed emails, app metadata, and creation timestamps (Critical for GoTrue validation)
UPDATE auth.users
SET 
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, now()),
    raw_app_meta_data = COALESCE(raw_app_meta_data, '{"provider":"email","providers":["email"]}'::jsonb),
    is_super_admin = COALESCE(is_super_admin, false),
    role = COALESCE(role, 'authenticated'),
    aud = COALESCE(aud, 'authenticated')
WHERE email_confirmed_at IS NULL OR raw_app_meta_data IS NULL OR created_at IS NULL OR aud IS NULL;

-- 7. Unconditionally guarantee aud is 'authenticated' for all users (Prevents GoTrue rejection)
UPDATE auth.users
SET aud = 'authenticated'
WHERE aud IS NULL OR aud = '';
