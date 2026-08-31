create table if not exists profiles (id uuid primary key references auth.users(id) on delete cascade, full_name text, skills text[] default '{}', keywords text[] default '{}', created_at timestamptz default now());
create table if not exists jobs (id text primary key, title text not null, company text not null, location text, url text not null, description text, source text not null, published_at timestamptz, created_at timestamptz default now());
create table if not exists saved_jobs (user_id uuid references auth.users(id) on delete cascade, job_id text references jobs(id) on delete cascade, status text default 'saved' check(status in ('saved','applied','interview','rejected','offer')), notes text, created_at timestamptz default now(), primary key(user_id,job_id));
alter table profiles enable row level security; alter table jobs enable row level security; alter table saved_jobs enable row level security;
create policy "Public jobs readable" on jobs for select using (true);
create policy "Users read own profile" on profiles for select using (auth.uid()=id);
create policy "Users update own profile" on profiles for update using (auth.uid()=id);
create policy "Users manage own saved jobs" on saved_jobs for all using (auth.uid()=user_id) with check (auth.uid()=user_id);