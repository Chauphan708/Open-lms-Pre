-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- 1. Discussion Sessions Table
create table if not exists public.discussion_sessions (
    id text primary key, -- PIN code (e.g., '123456')
    teacher_id text references public.profiles(id) on delete cascade,
    title text not null,
    status text default 'ACTIVE' check (status in ('ACTIVE', 'FINISHED')),
    visibility text default 'FULL', -- 'FULL', 'HIDDEN_ALL', 'NAME_ONLY', 'CONTENT_ONLY'
    active_round_id text,
    created_at timestamptz default now(),
    settings jsonb default '{}'::jsonb
);

-- 2. Discussion Rounds Table
create table if not exists public.discussion_rounds (
    id text primary key,
    session_id text references public.discussion_sessions(id) on delete cascade,
    name text not null,
    created_at timestamptz default now()
);

-- 3. Discussion Participants Table
create table if not exists public.discussion_participants (
    session_id text references public.discussion_sessions(id) on delete cascade,
    student_id text references public.profiles(id) on delete cascade,
    name text not null, -- Cache name for display
    is_hand_raised boolean default false,
    current_room_id text default 'MAIN',
    created_at timestamptz default now(),
    primary key (session_id, student_id)
);

-- 4. Discussion Polls Table
create table if not exists public.discussion_polls (
    id text primary key,
    session_id text references public.discussion_sessions(id) on delete cascade,
    question text not null,
    options jsonb not null, -- Array of {id, text, voteCount, voterIds}
    is_anonymous boolean default false,
    is_active boolean default true,
    created_at timestamptz default now()
);

-- 5. Discussion Messages Table
create table if not exists public.discussion_messages (
    id text primary key,
    session_id text references public.discussion_sessions(id) on delete cascade,
    sender_id text not null, -- Can be UUID or 'SYSTEM'
    sender_name text not null,
    content text not null,
    type text default 'TEXT' check (type in ('TEXT', 'IMAGE', 'STICKER', 'SYSTEM')),
    round_id text references public.discussion_rounds(id) on delete cascade,
    room_id text default 'MAIN', -- 'MAIN' or breakout room ID
    created_at timestamptz default now()
);

-- 6. Breakout Rooms (Optional, stored as JSON in session or separate table. Storing in session for simplicity or separate if needed complex logic)
-- For now we can manage breakout rooms structure in client or a simple table if persistent
create table if not exists public.discussion_breakout_rooms (
    id text primary key,
    session_id text references public.discussion_sessions(id) on delete cascade,
    name text not null,
    created_at timestamptz default now()
);

-- POLICIES (RLS) - Simple Allow All for prototype (You should refine this for production)
alter table public.discussion_sessions enable row level security;
create policy "Public access" on public.discussion_sessions for all using (true) with check (true);

alter table public.discussion_rounds enable row level security;
create policy "Public access" on public.discussion_rounds for all using (true) with check (true);

alter table public.discussion_participants enable row level security;
create policy "Public access" on public.discussion_participants for all using (true) with check (true);

alter table public.discussion_polls enable row level security;
create policy "Public access" on public.discussion_polls for all using (true) with check (true);

alter table public.discussion_messages enable row level security;
create policy "Public access" on public.discussion_messages for all using (true) with check (true);

alter table public.discussion_breakout_rooms enable row level security;
create policy "Public access" on public.discussion_breakout_rooms for all using (true) with check (true);

-- Enable Realtime
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table public.discussion_sessions;
alter publication supabase_realtime add table public.discussion_rounds;
alter publication supabase_realtime add table public.discussion_participants;
alter publication supabase_realtime add table public.discussion_polls;
alter publication supabase_realtime add table public.discussion_messages;
alter publication supabase_realtime add table public.discussion_breakout_rooms;
