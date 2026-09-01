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
  telegram_notified_at timestamptz
);
alter table public.jobs enable row level security;
drop policy if exists "Public jobs readable" on public.jobs;
create policy "Public jobs readable" on public.jobs
for select to anon, authenticated using (true);
create index if not exists jobs_published_at_idx on public.jobs(published_at desc);
alter table public.jobs add column if not exists category text not null default 'other';
create index if not exists jobs_category_published_idx on public.jobs(category, published_at desc);

alter table public.jobs add column if not exists telegram_notified_at timestamptz;
create index if not exists jobs_pending_telegram_idx on public.jobs(telegram_notified_at) where telegram_notified_at is null;

-- Prevent overlapping cron executions and duplicate notification races.
create table if not exists public.job_refresh_lock (
  id boolean primary key default true check (id),
  locked_until timestamptz
);
insert into public.job_refresh_lock (id, locked_until) values (true, null) on conflict (id) do nothing;
create or replace function public.try_acquire_job_refresh_lock()
returns boolean language plpgsql security definer as $$
declare acquired boolean;
begin
  update public.job_refresh_lock
  set locked_until = now() + interval '5 minutes'
  where id = true and (locked_until is null or locked_until < now())
  returning true into acquired;
  return coalesce(acquired,false);
end;
$$;

create or replace function public.release_job_refresh_lock()
returns void language sql security definer as $$
  update public.job_refresh_lock set locked_until = null where id = true;
$$;
