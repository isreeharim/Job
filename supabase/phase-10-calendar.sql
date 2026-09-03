-- Phase 10: follow-up and job-hunt calendar fields
alter table public.user_applications add column if not exists next_action text;
alter table public.user_applications add column if not exists next_action_date date;
create index if not exists user_applications_next_action_idx on public.user_applications(user_id,next_action_date);