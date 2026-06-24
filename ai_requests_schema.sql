-- Table for storing student AI requests gated by teacher approvals
create table if not exists public.ai_requests (
    id uuid primary key default gen_random_uuid(),
    student_id text not null,
    student_name text not null,
    feature_name text not null, -- 'portfolio_analysis' or 'learning_analytics'
    status text not null default 'pending', -- 'pending', 'approved', 'rejected'
    request_data jsonb not null,
    response_data text,
    created_at timestamptz default now(),
    actioned_by text,
    actioned_at timestamptz
);

-- Enable RLS
alter table public.ai_requests enable row level security;

-- Policies
drop policy if exists "Allow public access for prototype" on public.ai_requests;
create policy "Allow public access for prototype" on public.ai_requests for all using (true) with check (true);

grant all on public.ai_requests to anon, authenticated, service_role;
