-- Phase 8: RemoteFlow user cloud sync
-- Run in Supabase SQL Editor after Phase 7 Auth is enabled.
create table if not exists public.user_saved_jobs (
 user_id uuid not null references auth.users(id) on delete cascade,
 job_id text not null,
 title text not null,
 company text not null,
 location text,
 url text,
 source text,
 published_at timestamptz,
 created_at timestamptz not null default now(),
 primary key(user_id,job_id)
);
create table if not exists public.user_applications (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null,
 company text not null,
 url text,
 status text not null default 'Applied',
 application_date date not null default current_date,
 notes text not null default '',
 updated_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
create table if not exists public.user_alert_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 email text,
 categories jsonb not null default '["all"]'::jsonb,
 locations jsonb not null default '["all"]'::jsonb,
 fresh_only boolean not null default true,
 enabled boolean not null default true,
 updated_at timestamptz not null default now()
);
alter table public.user_saved_jobs enable row level security;
alter table public.user_applications enable row level security;
alter table public.user_alert_preferences enable row level security;
drop policy if exists "saved own rows" on public.user_saved_jobs;
create policy "saved own rows" on public.user_saved_jobs for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists "applications own rows" on public.user_applications;
create policy "applications own rows" on public.user_applications for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists "preferences own rows" on public.user_alert_preferences;
create policy "preferences own rows" on public.user_alert_preferences for all using (auth.uid()=user_id) with check (auth.uid()=user_id);