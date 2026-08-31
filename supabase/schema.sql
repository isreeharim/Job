create table if not exists public.jobs (
  id text primary key,
  title text not null,
  company text not null,
  location text,
  url text not null,
  description text,
  source text not null,
  published_at timestamptz,
  created_at timestamptz default now()
);
alter table public.jobs enable row level security;
drop policy if exists "Public jobs readable" on public.jobs;
create policy "Public jobs readable" on public.jobs
for select to anon, authenticated using (true);
create index if not exists jobs_published_at_idx on public.jobs(published_at desc);