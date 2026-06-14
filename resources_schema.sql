-- Create Resources Table
create table if not exists public.resources (
    id text primary key,
    title text not null,
    url text not null,
    type text default 'LINK' check (type in ('LINK', 'EMBED')),
    topic text default 'General', -- New column for filtering
    description text,
    addedBy text, -- user_id of creator
    createdAt timestamptz default now()
);

-- RLS
alter table public.resources enable row level security;
create policy "Public access" on public.resources for all using (true) with check (true);

-- Enable Realtime
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table public.resources;
