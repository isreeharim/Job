create extension if not exists pgcrypto;

create table if not exists public.jobs (
  id text primary key,
  title text not null,
  company text not null,
  location text,
  url text not null,
  description text,
  source text not null,
  category text not null default 'other',
  published_at timestamptz,
  created_at timestamptz default now(),
  telegram_notified_at timestamptz,
  telegram_notification_error text
);
alter table public.jobs enable row level security;
drop policy if exists "Public jobs readable" on public.jobs;
create policy "Public jobs readable" on public.jobs for select to anon, authenticated using (true);
create index if not exists jobs_published_at_idx on public.jobs(published_at desc);
create index if not exists jobs_created_at_idx on public.jobs(created_at desc);
create index if not exists jobs_category_published_idx on public.jobs(category, published_at desc);
create index if not exists jobs_pending_telegram_idx on public.jobs(telegram_notified_at) where telegram_notified_at is null;

create table if not exists public.job_refresh_lock (
  id boolean primary key default true check (id),
  locked_until timestamptz,
  lock_token text
);
insert into public.job_refresh_lock (id, locked_until, lock_token)
values (true, null, null) on conflict (id) do nothing;

create or replace function public.try_acquire_job_refresh_lock()
returns text language plpgsql security definer as $$
declare token text := gen_random_uuid()::text;
begin
  update public.job_refresh_lock
  set locked_until=now()+interval '5 minutes', lock_token=token
  where id=true and (locked_until is null or locked_until<now());
  if found then return token; end if;
  return null;
end;
$$;

create or replace function public.release_job_refresh_lock(p_token text)
returns boolean language plpgsql security definer as $$
begin
  update public.job_refresh_lock
  set locked_until=null, lock_token=null
  where id=true and lock_token=p_token;
  return found;
end;
$$;

create index if not exists jobs_notification_error_idx on public.jobs(telegram_notification_error) where telegram_notification_error is not null;

create table if not exists public.job_refresh_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running',
  jobs_found integer default 0,
  jobs_saved integer default 0,
  new_jobs integer default 0,
  notification_sent integer default 0,
  error text
);
create index if not exists job_refresh_runs_started_idx on public.job_refresh_runs(started_at desc);
