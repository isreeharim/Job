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
