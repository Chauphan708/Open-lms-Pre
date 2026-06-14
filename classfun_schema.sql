-- =============================================
-- CLASS FUN (Lớp Học Vui Vẻ) - Supabase Schema
-- Chạy script này trên Supabase SQL Editor
-- =============================================

-- 1. Bảng Nhóm/Tổ trong lớp
create table if not exists public.class_groups (
    id text primary key default concat('grp_', replace(gen_random_uuid()::text, '-', '')),
    class_id text not null, -- Liên kết với bảng classes có sẵn
    name text not null,
    color text default 'bg-sky-500',
    sort_order int default 0,
    created_at timestamptz default now()
);

-- 2. Bảng Hành vi (Tích cực / Tiêu cực)
create table if not exists public.behaviors (
    id text primary key default concat('beh_', replace(gen_random_uuid()::text, '-', '')),
    teacher_id text references public.profiles(id) on delete cascade,
    description text not null,
    type text not null check (type in ('POSITIVE', 'NEGATIVE')),
    points int not null, -- Dương cho tích cực, Âm cho tiêu cực
    created_at timestamptz default now()
);

-- 3. Bảng Ghi nhận điểm hành vi (Thay thế "history" array cũ)
create table if not exists public.behavior_logs (
    id text primary key default concat('log_', replace(gen_random_uuid()::text, '-', '')),
    student_id text not null references public.profiles(id) on delete cascade,
    class_id text not null,
    behavior_id text references public.behaviors(id) on delete set null,
    points int not null,
    reason text,
    recorded_by text references public.profiles(id) on delete set null,
    created_at timestamptz default now()
);

-- 4. Bảng Điểm danh
create table if not exists public.attendance (
    id text primary key default concat('att_', replace(gen_random_uuid()::text, '-', '')),
    student_id text not null references public.profiles(id) on delete cascade,
    class_id text not null,
    date date not null,
    status text not null check (status in ('present', 'excused', 'unexcused')),
    recorded_by text references public.profiles(id) on delete set null,
    created_at timestamptz default now(),
    unique(student_id, class_id, date) -- Mỗi học sinh chỉ có 1 bản ghi/ngày/lớp
);

-- 5. Bảng Phân công học sinh vào nhóm/tổ
create table if not exists public.class_group_members (
    group_id text not null references public.class_groups(id) on delete cascade,
    student_id text not null references public.profiles(id) on delete cascade,
    created_at timestamptz default now(),
    primary key (group_id, student_id)
);

-- Indexes cho hiệu suất truy vấn
create index if not exists idx_behavior_logs_student on public.behavior_logs(student_id);
create index if not exists idx_behavior_logs_class on public.behavior_logs(class_id);
create index if not exists idx_behavior_logs_created on public.behavior_logs(created_at);
create index if not exists idx_attendance_date on public.attendance(date);
create index if not exists idx_attendance_class on public.attendance(class_id);

-- RLS Policies
alter table public.class_groups enable row level security;
drop policy if exists "Public access" on public.class_groups;
create policy "Authenticated read access" on public.class_groups for select to authenticated using (true);
create policy "Teacher full access" on public.class_groups for all to authenticated using (true) with check (true);

alter table public.behaviors enable row level security;
drop policy if exists "Public access" on public.behaviors;
create policy "Authenticated read access" on public.behaviors for select to authenticated using (true);
create policy "Teacher full access" on public.behaviors for all to authenticated using (auth.uid()::text = teacher_id) with check (auth.uid()::text = teacher_id);

alter table public.behavior_logs enable row level security;
drop policy if exists "Public access" on public.behavior_logs;
create policy "Authenticated read access" on public.behavior_logs for select to authenticated using (true);
create policy "Teacher full access" on public.behavior_logs for all to authenticated using (true) with check (true);

alter table public.attendance enable row level security;
drop policy if exists "Public access" on public.attendance;
create policy "Authenticated read access" on public.attendance for select to authenticated using (true);
create policy "Teacher full access" on public.attendance for all to authenticated using (true) with check (true);

alter table public.class_group_members enable row level security;
drop policy if exists "Public access" on public.class_group_members;
create policy "Authenticated read access" on public.class_group_members for select to authenticated using (true);
create policy "Teacher full access" on public.class_group_members for all to authenticated using (true) with check (true);

-- Enable Realtime cho các bảng mới
alter publication supabase_realtime add table public.behavior_logs;
alter publication supabase_realtime add table public.attendance;
