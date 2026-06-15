-- Migration: onboarding_responses
-- Captures the full first-run survey (Phase A "about you" + Phase B "habits &
-- goals") so acquisition/cohort analytics can be answered later. Run once
-- against the live project (Supabase SQL editor). Idempotent.

create table if not exists public.onboarding_responses (
  user_id uuid primary key references public.users(id) on delete cascade,
  -- Phase A — about you
  display_name text,
  instrument text,
  role text,
  level text,
  years_playing text,
  age_range text,
  country text,
  has_teacher boolean,
  referral_source text,
  -- Phase B — habits & goals
  weekly_frequency text,
  session_length text,
  daily_goal_min int,
  primary_goal text,
  struggle text,
  piece_name text,
  composer text,
  audition_name text,
  audition_date date,
  -- meta
  timezone text,
  completed_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.onboarding_responses enable row level security;

drop policy if exists "onboarding_responses_self" on public.onboarding_responses;
create policy "onboarding_responses_self" on public.onboarding_responses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
