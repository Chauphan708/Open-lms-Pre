-- Add allowed_grades column to profiles table if it doesn't exist
alter table public.profiles 
add column if not exists allowed_grades text[] default '{}';
