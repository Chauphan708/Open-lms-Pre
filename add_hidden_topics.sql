-- SQL migration to add hidden_topics column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hidden_topics text[] DEFAULT '{}';
