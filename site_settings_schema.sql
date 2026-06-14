
-- Table for global system settings
create table if not exists public.system_settings (
    key text primary key,
    value jsonb not null,
    updated_at timestamptz default now()
);

-- Basic RLS
alter table public.system_settings enable row level security;
create policy "Public read access" on public.system_settings for select using (true);
create policy "Admin only write" on public.system_settings for all using (
    exists (select 1 from public.profiles where id = auth.uid()::text and role = 'ADMIN')
) with check (
    exists (select 1 from public.profiles where id = auth.uid()::text and role = 'ADMIN')
);

-- Initial data
insert into public.system_settings (key, value) values 
('footer_config', '{
    "slogan": "Nâng tầm giáo dục số Việt Nam",
    "hotline": "1900 xxxx",
    "email": "support@openlms.vn",
    "facebook": "https://facebook.com/openlms",
    "zalo": "https://zalo.me/xxxx",
    "address": "TP. Cần Thơ, Việt Nam"
}'::jsonb)
on conflict (key) do nothing;
