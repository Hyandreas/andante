-- ────────────────────────────────────────────────────────────────────────────
-- Andante — full schema (Practice OS scope)
-- Run this in the Supabase SQL editor in order. RLS is enabled on every table.
-- ────────────────────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── Users (extends auth.users) ─────────────────────────────────────────────
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  instrument text,
  region_flag text,                          -- emoji like '🇺🇸'
  daily_goal_min int default 90,
  timezone text default 'America/New_York',
  role text default 'musician' check (role in ('musician','teacher')),
  onboarded_at timestamptz,
  created_at timestamptz default now()
);

-- ─── Pieces ─────────────────────────────────────────────────────────────────
create table public.pieces (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  composer text,
  role text,                                 -- 'Concerto' | 'Sonata' | 'Etude' | 'Solo' | 'Excerpt'
  progress int default 0 check (progress between 0 and 100),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ─── Sheet Music ───────────────────────────────────────────────────────────
-- User uploads live in the private Supabase Storage bucket 'sheet-music'.
-- IMSLP rows store cautious source metadata; generated rows attach Composer
-- Mode output after transcription.
create table public.sheet_music (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  piece_id uuid references public.pieces(id) on delete set null,
  title text not null,
  composer text,
  origin text not null default 'upload' check (origin in ('upload','imslp','pathway','generated')),
  source_name text,
  source_url text,
  license text,
  attribution text,
  is_public boolean not null default false,
  created_at timestamptz default now(),
  check (user_id is not null or is_public)
);

create table public.sheet_music_files (
  id uuid primary key default uuid_generate_v4(),
  sheet_music_id uuid not null references public.sheet_music(id) on delete cascade,
  kind text not null check (kind in ('pdf','image','musicxml','midi','audio-source')),
  storage_bucket text,
  storage_path text,
  external_url text,
  content_type text,
  size_bytes int,
  display_order int not null default 0,
  created_at timestamptz default now(),
  check (storage_path is not null or external_url is not null)
);

-- ─── Sessions ───────────────────────────────────────────────────────────────
create table public.sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_sec int,
  focus_type text check (focus_type in ('repertoire','scales','etudes','sight-reading')),
  session_mode text not null default 'practice' check (session_mode in ('practice','composer')),
  entry_pathway_id text,
  entry_requirement_id uuid,
  notes text,
  created_at timestamptz default now()
);

create table public.session_pieces (
  session_id uuid not null references public.sessions(id) on delete cascade,
  piece_id uuid not null references public.pieces(id) on delete cascade,
  primary key (session_id, piece_id)
);

create table public.session_sheet_music (
  session_id uuid not null references public.sessions(id) on delete cascade,
  sheet_music_id uuid not null references public.sheet_music(id) on delete cascade,
  role text not null default 'primary',
  created_at timestamptz default now(),
  primary key (session_id, sheet_music_id)
);

-- ─── Auditions ──────────────────────────────────────────────────────────────
create table public.auditions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  location text,
  date date not null,
  notes text,
  created_at timestamptz default now()
);

-- ─── Pathways (curated competition / audition tracks) ───────────────────────
-- Pathways are global (not user-scoped). Users enroll via pathway_enrollments.
create table public.pathways (
  id text primary key,                       -- e.g. 'ny-allstate'
  region text not null,                      -- 'USA · New York'
  flag text,                                 -- '🇺🇸'
  name text not null,
  deadline_label text,                       -- 'Apr 12 · audition window'
  deadline_date date,
  enrolled_count int default 0,
  insight text,
  created_at timestamptz default now()
);

create table public.pathway_requirements (
  id uuid primary key default uuid_generate_v4(),
  pathway_id text not null references public.pathways(id) on delete cascade,
  sheet_music_id uuid references public.sheet_music(id) on delete set null,
  position int not null,
  label text not null,                       -- 'Solo from NYSSMA Manual Lvl 6'
  piece_label text                           -- 'Bach Sonata No. 1 in G minor'
);

alter table public.sessions
  add constraint sessions_entry_pathway_fk
  foreign key (entry_pathway_id) references public.pathways(id) on delete set null;

alter table public.sessions
  add constraint sessions_entry_requirement_fk
  foreign key (entry_requirement_id) references public.pathway_requirements(id) on delete set null;

create table public.pathway_enrollments (
  user_id uuid not null references public.users(id) on delete cascade,
  pathway_id text not null references public.pathways(id) on delete cascade,
  enrolled_at timestamptz default now(),
  primary key (user_id, pathway_id)
);

create table public.pathway_progress (
  user_id uuid not null references public.users(id) on delete cascade,
  requirement_id uuid not null references public.pathway_requirements(id) on delete cascade,
  status text default 'todo' check (status in ('todo','active','done')),
  updated_at timestamptz default now(),
  primary key (user_id, requirement_id)
);

-- ─── Recordings ─────────────────────────────────────────────────────────────
-- Files live in Supabase Storage bucket 'recordings'; here we only track metadata.
create table public.recordings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  piece_id uuid references public.pieces(id) on delete set null,
  storage_path text not null,                -- e.g. 'userId/recId.webm'
  duration_sec int,
  title text,
  flagged boolean default false,
  created_at timestamptz default now()
);

create table public.recording_annotations (
  id uuid primary key default uuid_generate_v4(),
  recording_id uuid not null references public.recordings(id) on delete cascade,
  at_sec int not null,                       -- timestamp within the clip
  note text not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

create table public.composer_jobs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  source_recording_id uuid references public.recordings(id) on delete set null,
  generated_sheet_music_id uuid references public.sheet_music(id) on delete set null,
  status text not null default 'queued' check (status in ('queued','processing','completed','failed')),
  worker_run_id text,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);

-- ─── Submit-a-Take (recordings tied to a pathway requirement, judged) ───────
create table public.takes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  requirement_id uuid references public.pathway_requirements(id) on delete set null,
  recording_id uuid references public.recordings(id) on delete set null,
  status text default 'pending' check (status in ('pending','judged','withdrawn')),
  score int check (score between 0 and 100),
  submitted_at timestamptz default now(),
  judged_at timestamptz
);

create table public.take_feedback (
  id uuid primary key default uuid_generate_v4(),
  take_id uuid not null references public.takes(id) on delete cascade,
  reviewer_id uuid references public.users(id) on delete set null,
  reviewer_role text,                        -- 'Cohort Judge', 'Peer'
  reviewer_note text,                        -- 'Anonymous · CMIM finalist 23'
  body text not null,
  created_at timestamptz default now()
);

-- ─── Practice Rooms ─────────────────────────────────────────────────────────
create table public.rooms (
  id uuid primary key default uuid_generate_v4(),
  host_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  focus text,                                -- 'Repertoire' | 'Excerpts' | ...
  piece_label text,
  region text,                               -- '🇺🇸 NYC'
  max_seats int default 12,
  scheduled_for timestamptz,                 -- null = live/open now
  is_open boolean default true,
  created_at timestamptz default now()
);

-- Live presence is also tracked in a Realtime channel; this row is the join record.
create table public.room_seats (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (room_id, user_id)
);

-- ─── Leaderboard / kudos ────────────────────────────────────────────────────
create table public.kudos (
  from_user_id uuid not null references public.users(id) on delete cascade,
  to_user_id uuid not null references public.users(id) on delete cascade,
  context text,                              -- e.g. 'take:<takeId>' or 'streak'
  created_at timestamptz default now(),
  primary key (from_user_id, to_user_id, context)
);

-- ─── Subscriptions ──────────────────────────────────────────────────────────
create table public.subscriptions (
  user_id uuid primary key references public.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free' check (plan in ('free','pro','studio')),
  status text default 'active',              -- active, past_due, canceled
  cadence text default 'monthly',            -- monthly | yearly
  period_end timestamptz,
  updated_at timestamptz default now()
);

create or replace function public.has_paid_entitlement(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select check_user_id = auth.uid()
    and exists (
      select 1
      from public.subscriptions s
      where s.user_id = check_user_id
        and s.plan in ('pro','studio')
        and s.status in ('active','trialing')
        and (s.period_end is null or s.period_end > now())
    );
$$;
revoke all on function public.has_paid_entitlement(uuid) from public;
grant execute on function public.has_paid_entitlement(uuid) to authenticated;

-- ─── User preferences ──────────────────────────────────────────────────────
create table public.user_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  theme text not null default 'system' check (theme in ('system','light','dark')),
  reduced_motion boolean not null default false,
  density text not null default 'comfortable' check (density in ('comfortable','compact')),
  default_focus_type text default 'repertoire' check (default_focus_type in ('repertoire','scales','etudes','sight-reading')),
  practice_reminder_enabled boolean not null default false,
  practice_reminder_time time not null default '18:00',
  practice_reminder_days text[] not null default array['mon','tue','wed','thu','fri']::text[],
  email_practice_reminders boolean not null default true,
  push_practice_reminders boolean not null default false,
  parent_digest_emails boolean not null default true,
  product_emails boolean not null default true,
  last_practice_reminder_sent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Onboarding responses (first-run survey) ────────────────────────────────
-- One row per user, captured when they finish onboarding. Stores the full
-- survey (Phase A "about you" + Phase B "habits & goals") so acquisition and
-- cohort questions ("how did you hear about us", "primary goal", …) can be
-- answered later. App-functional fields (display_name, instrument,
-- daily_goal_min) also live on public.users; this table is the complete record.
-- `role` here is the self-described survey answer (student/hobbyist/pro/teacher)
-- and carries NO authorization meaning — distinct from public.users.role.
create table public.onboarding_responses (
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

-- ─── Teacher / Studio ───────────────────────────────────────────────────────
create table public.teachers (
  user_id uuid primary key references public.users(id) on delete cascade,
  studio_name text,
  bio text,
  created_at timestamptz default now()
);

create table public.teacher_students (
  teacher_id uuid not null references public.teachers(user_id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  invite_token uuid default uuid_generate_v4() unique,
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  primary key (teacher_id, student_id)
);

create table public.assignments (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid not null references public.teachers(user_id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  piece_label text not null,
  instruction text,
  due_date date,
  done_at timestamptz,
  created_at timestamptz default now()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
create index sessions_user_date on public.sessions(user_id, started_at desc);
create index pieces_user_active on public.pieces(user_id, is_active);
create index sheet_music_user_origin on public.sheet_music(user_id, origin, created_at desc);
create index sheet_music_files_music on public.sheet_music_files(sheet_music_id, display_order);
create index session_pieces_session on public.session_pieces(session_id);
create index session_sheet_music_session on public.session_sheet_music(session_id);
create index auditions_user_date on public.auditions(user_id, date);
create index recordings_user_date on public.recordings(user_id, created_at desc);
create index composer_jobs_status on public.composer_jobs(status, created_at);
create index takes_user_status on public.takes(user_id, status);
create index takes_requirement on public.takes(requirement_id);
create index room_seats_room on public.room_seats(room_id);
create index pathway_progress_user on public.pathway_progress(user_id);
create index assignments_student on public.assignments(student_id, due_date);

-- ─── RLS — enable on every user-scoped table ────────────────────────────────
alter table public.users enable row level security;
alter table public.pieces enable row level security;
alter table public.sheet_music enable row level security;
alter table public.sheet_music_files enable row level security;
alter table public.sessions enable row level security;
alter table public.session_pieces enable row level security;
alter table public.session_sheet_music enable row level security;
alter table public.auditions enable row level security;
alter table public.pathway_enrollments enable row level security;
alter table public.pathway_progress enable row level security;
alter table public.recordings enable row level security;
alter table public.recording_annotations enable row level security;
alter table public.composer_jobs enable row level security;
alter table public.takes enable row level security;
alter table public.take_feedback enable row level security;
alter table public.rooms enable row level security;
alter table public.room_seats enable row level security;
alter table public.kudos enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_preferences enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.onboarding_responses enable row level security;
alter table public.teachers enable row level security;
alter table public.teacher_students enable row level security;
alter table public.assignments enable row level security;

-- pathways + pathway_requirements are global reference data — read-only public
alter table public.pathways enable row level security;
alter table public.pathway_requirements enable row level security;
create policy "pathways_read"   on public.pathways
  for select to authenticated using (true);
create policy "pathway_reqs_read" on public.pathway_requirements
  for select to authenticated using (true);

-- ─── Policies ───────────────────────────────────────────────────────────────
-- Users may read and update their own row, but MUST NOT be able to escalate
-- their own privileges. A bare `for all ... with check (auth.uid() = id)` let a
-- user flip their own `role` to 'teacher' (which unlocks teacher_reads_student_*
-- read access). We split into SELECT + UPDATE: the UPDATE with-check pins `role`
-- to its current stored value, and `revoke update (role)` removes the column
-- privilege entirely so role can only change via the service-role key or a
-- SECURITY DEFINER admin path. Other self-editable columns (email, onboarded_at,
-- display_name, etc.) are unaffected. INSERT is intentionally NOT granted here —
-- the public.users row is created by the handle_new_user() trigger on signup.
create policy "users_self_read" on public.users
  for select using (auth.uid() = id);
create policy "users_self_update" on public.users
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select u.role from public.users u where u.id = auth.uid())
  );
revoke update (role) on public.users from authenticated;

-- Other users' PUBLIC profile fields (name, instrument, region) are exposed
-- only through the public.profiles view below — NOT via a blanket select on
-- users, which would also hand every signed-in user everyone else's email.
-- A user's own full row stays readable via users_self_read; teachers read enrolled
-- students through the dedicated policies further down.
create or replace view public.profiles
  with (security_invoker = false) as
  select id, display_name, instrument, region_flag, created_at
  from public.users;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

-- Defense in depth: the with-check stops a user moving a row to another owner.
create policy "pieces_own"     on public.pieces
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "sheet_music_read" on public.sheet_music
  for select using (is_public or auth.uid() = user_id);
-- User-created rows must be private, carry a user-attributable origin
-- ('upload' | 'imslp' — 'pathway'/'generated' rows come from the service-role
-- path, which bypasses RLS), and may only attach to a piece the user owns.
create policy "sheet_music_insert_own" on public.sheet_music
  for insert with check (
    auth.uid() = user_id
    and is_public = false
    and origin in ('upload','imslp')
    and (piece_id is null or piece_id in (
      select id from public.pieces where user_id = auth.uid()
    ))
  );
create policy "sheet_music_update_own" on public.sheet_music
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id and is_public = false);
create policy "sheet_music_delete_own" on public.sheet_music
  for delete using (auth.uid() = user_id);

create policy "sheet_music_files_read" on public.sheet_music_files
  for select using (
    sheet_music_id in (
      select id from public.sheet_music
      where is_public or user_id = auth.uid()
    )
  );
create policy "sheet_music_files_insert_own" on public.sheet_music_files
  for insert with check (
    sheet_music_id in (select id from public.sheet_music where user_id = auth.uid())
    and (storage_path is null or storage_path like (auth.uid()::text || '/%'))
  );
create policy "sheet_music_files_update_own" on public.sheet_music_files
  for update using (
    sheet_music_id in (select id from public.sheet_music where user_id = auth.uid())
  ) with check (
    sheet_music_id in (select id from public.sheet_music where user_id = auth.uid())
    and (storage_path is null or storage_path like (auth.uid()::text || '/%'))
  );
create policy "sheet_music_files_delete_own" on public.sheet_music_files
  for delete using (
    sheet_music_id in (select id from public.sheet_music where user_id = auth.uid())
  );

-- Defense in depth: the with-check stops a user moving a row to another owner.
-- The duration bound clamps practice time to 0..24h to limit leaderboard fraud.
alter table public.sessions
  add constraint sessions_duration_bounds
  check (duration_sec >= 0 and duration_sec <= 86400);
create policy "sessions_own"   on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "session_pieces_own" on public.session_pieces
  for all using (
    session_id in (select id from public.sessions where user_id = auth.uid())
  ) with check (
    session_id in (select id from public.sessions where user_id = auth.uid())
    and piece_id in (select id from public.pieces where user_id = auth.uid())
  );

create policy "session_sheet_music_own" on public.session_sheet_music
  for all using (
    session_id in (select id from public.sessions where user_id = auth.uid())
  ) with check (
    session_id in (select id from public.sessions where user_id = auth.uid())
    and sheet_music_id in (
      select id from public.sheet_music where is_public or user_id = auth.uid()
    )
  );

-- Defense in depth: each with-check stops a user moving a row to another owner.
create policy "auditions_own"  on public.auditions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "enrollments_own" on public.pathway_enrollments
  for all using (
    auth.uid() = user_id and public.has_paid_entitlement(auth.uid())
  ) with check (
    auth.uid() = user_id and public.has_paid_entitlement(auth.uid())
  );

create policy "progress_own"   on public.pathway_progress
  for all using (
    auth.uid() = user_id and public.has_paid_entitlement(auth.uid())
  ) with check (
    auth.uid() = user_id and public.has_paid_entitlement(auth.uid())
  );

create policy "recordings_own" on public.recordings
  for all using (
    auth.uid() = user_id and public.has_paid_entitlement(auth.uid())
  ) with check (
    auth.uid() = user_id
    and public.has_paid_entitlement(auth.uid())
    and storage_path like (auth.uid()::text || '/%')
  );

create policy "annotations_read" on public.recording_annotations
  for select using (
    public.has_paid_entitlement(auth.uid())
    and recording_id in (select id from public.recordings where user_id = auth.uid())
  );
create policy "annotations_write" on public.recording_annotations
  for insert with check (
    created_by = auth.uid()
    and public.has_paid_entitlement(auth.uid())
    and recording_id in (select id from public.recordings where user_id = auth.uid())
  );

create policy "composer_jobs_own" on public.composer_jobs
  for all using (
    auth.uid() = user_id and public.has_paid_entitlement(auth.uid())
  )
  with check (
    auth.uid() = user_id
    and public.has_paid_entitlement(auth.uid())
    and session_id in (select id from public.sessions where user_id = auth.uid())
    and (
      source_recording_id is null
      or source_recording_id in (select id from public.recordings where user_id = auth.uid())
    )
  );

-- Takes: owner may submit + read + withdraw their own takes, but MUST NOT be
-- able to judge themselves. The old bare `for all using (auth.uid() = user_id)`
-- had no with-check, so a user could set their own `score = 100,
-- status = 'judged'`. We split into SELECT / INSERT / UPDATE: inserts must start
-- unjudged ('pending', score null, judged_at null); updates may only withdraw
-- (status stays in pending/withdrawn and may never carry a score/judged_at). The
-- `score`/`judged_at` column privileges are revoked outright, so judging only
-- happens via the service-role / reviewer path. (Judges read pending takes
-- assigned to them — V2.)
create policy "takes_own_read" on public.takes
  for select using (
    auth.uid() = user_id and public.has_paid_entitlement(auth.uid())
  );
create policy "takes_own_insert" on public.takes
  for insert with check (
    auth.uid() = user_id
    and public.has_paid_entitlement(auth.uid())
    and status = 'pending'
    and score is null
    and judged_at is null
    and (
      recording_id is null
      or recording_id in (select id from public.recordings where user_id = auth.uid())
    )
  );
create policy "takes_own_withdraw" on public.takes
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and public.has_paid_entitlement(auth.uid())
    and score is null
    and judged_at is null
    and status in ('pending','withdrawn')
  );
revoke update (score, judged_at) on public.takes from authenticated;

create policy "take_feedback_read" on public.take_feedback
  for select using (
    take_id in (select id from public.takes where user_id = auth.uid())
  );
-- Feedback is written only by trusted reviewer/service-role workflows until a
-- reviewer-assignment table exists. A bare reviewer_id=self policy lets any
-- authenticated user inject feedback into guessed take ids.

-- Rooms: any authenticated user can browse + join open rooms
create policy "rooms_read"     on public.rooms
  for select to authenticated using (public.has_paid_entitlement(auth.uid()));
create policy "rooms_host_write" on public.rooms
  for insert with check (auth.uid() = host_id and public.has_paid_entitlement(auth.uid()));
create policy "rooms_host_update" on public.rooms
  for update using (
    auth.uid() = host_id and public.has_paid_entitlement(auth.uid())
  ) with check (
    auth.uid() = host_id and public.has_paid_entitlement(auth.uid())
  );

-- Room seats: the bare `for all using (auth.uid() = user_id)` let a user join
-- CLOSED rooms and occupy seats past capacity (no with-check on insert). We split
-- into SELECT (anyone may see who's in a room), INSERT/join (only into your own
-- seat, only when the room is open AND below max_seats — capacity is counted at
-- insert time), and DELETE/leave (your own seat only). Capacity is enforced with
-- the rooms columns that exist: `is_open` and `max_seats`. Note this count check
-- is best-effort under concurrency; the host/service-role path remains the
-- authority for hard capacity limits.
create policy "seats_read"     on public.room_seats
  for select to authenticated using (public.has_paid_entitlement(auth.uid()));
create policy "seats_join"     on public.room_seats
  for insert with check (
    auth.uid() = user_id
    and public.has_paid_entitlement(auth.uid())
    and exists (
      select 1 from public.rooms r
      where r.id = room_id
        and r.is_open
        and (select count(*) from public.room_seats s where s.room_id = r.id) < r.max_seats
    )
  );
create policy "seats_leave"    on public.room_seats
  for delete using (auth.uid() = user_id);

-- Kudos: anyone can give, recipient sees inbound. The from_user_id check is
-- correct as-is. NOTE: `context` (e.g. 'take:<id>' / 'streak') is free-form here;
-- validate its shape and rate-limit kudos sending at the API layer.
create policy "kudos_send"     on public.kudos
  for insert with check (
    auth.uid() = from_user_id and public.has_paid_entitlement(auth.uid())
  );
create policy "kudos_read"     on public.kudos
  for select using (
    auth.uid() in (from_user_id, to_user_id)
    and public.has_paid_entitlement(auth.uid())
  );

-- Subscriptions: read-only to the user
create policy "sub_read"       on public.subscriptions
  for select using (auth.uid() = user_id);

-- Settings
create policy "preferences_self" on public.user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Onboarding responses: a user reads/writes only their own row.
create policy "onboarding_responses_self" on public.onboarding_responses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "push_subscriptions_self" on public.push_subscriptions
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      lower(endpoint) like 'https://fcm.googleapis.com/%'
      or lower(endpoint) like 'https://updates.push.services.mozilla.com/%'
      or lower(endpoint) like 'https://web.push.apple.com/%'
      or lower(endpoint) like 'https://%.push.apple.com/%'
      or lower(endpoint) like 'https://%.notify.windows.com/%'
    )
  );

-- Teachers
create policy "teacher_self_read" on public.teachers
  for select using (auth.uid() = user_id);
create policy "teacher_self_insert" on public.teachers
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.users where id = auth.uid() and role = 'teacher')
  );
create policy "teacher_self_update" on public.teachers
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.users where id = auth.uid() and role = 'teacher')
  );
create policy "teacher_self_delete" on public.teachers
  for delete using (auth.uid() = user_id);

-- A teacher can invite and remove students, but must NOT be able to accept on
-- a student's behalf. This is load-bearing: teacher_reads_student_* below grant
-- read access to a student's sessions/pieces once accepted_at is set, so if a
-- teacher could set accepted_at themselves, any user could self-enroll an
-- arbitrary victim and read their practice data. Acceptance is student-only.
create policy "teacher_students_teacher_invite" on public.teacher_students
  for insert with check (
    auth.uid() = teacher_id
    and accepted_at is null
    and exists (select 1 from public.users where id = auth.uid() and role = 'teacher')
  );
create policy "teacher_students_teacher_read" on public.teacher_students
  for select using (
    auth.uid() = teacher_id
    and exists (select 1 from public.users where id = auth.uid() and role = 'teacher')
  );
create policy "teacher_students_teacher_remove" on public.teacher_students
  for delete using (
    auth.uid() = teacher_id
    and exists (select 1 from public.users where id = auth.uid() and role = 'teacher')
  );
create policy "teacher_students_student_read" on public.teacher_students
  for select using (auth.uid() = student_id);
create policy "teacher_students_student_accept" on public.teacher_students
  for update using (auth.uid() = student_id)
  with check (auth.uid() = student_id and accepted_at is not null);
revoke update (teacher_id, student_id, invite_token, invited_at) on public.teacher_students from authenticated;

-- Teachers can read their accepted students' sessions / pieces / takes
create policy "teacher_reads_student_sessions" on public.sessions
  for select using (
    user_id in (
      select student_id from public.teacher_students
      where teacher_id = auth.uid() and accepted_at is not null
    )
  );

create policy "teacher_reads_student_pieces" on public.pieces
  for select using (
    user_id in (
      select student_id from public.teacher_students
      where teacher_id = auth.uid() and accepted_at is not null
    )
  );

-- Assignments
create policy "assignments_teacher_read" on public.assignments
  for select using (
    auth.uid() = teacher_id
    and exists (select 1 from public.users where id = auth.uid() and role = 'teacher')
  );
create policy "assignments_teacher_insert" on public.assignments
  for insert with check (
    auth.uid() = teacher_id
    and exists (select 1 from public.users where id = auth.uid() and role = 'teacher')
    and student_id in (
      select student_id from public.teacher_students
      where teacher_id = auth.uid() and accepted_at is not null
    )
  );
create policy "assignments_teacher_update" on public.assignments
  for update using (
    auth.uid() = teacher_id
    and exists (select 1 from public.users where id = auth.uid() and role = 'teacher')
  ) with check (
    auth.uid() = teacher_id
    and exists (select 1 from public.users where id = auth.uid() and role = 'teacher')
    and student_id in (
      select student_id from public.teacher_students
      where teacher_id = auth.uid() and accepted_at is not null
    )
  );
create policy "assignments_teacher_delete" on public.assignments
  for delete using (
    auth.uid() = teacher_id
    and exists (select 1 from public.users where id = auth.uid() and role = 'teacher')
  );
create policy "assignments_student" on public.assignments
  for select using (auth.uid() = student_id);

-- Storage bucket for private sheet music uploads. User-owned uploads are
-- stored under '<user-id>/...' so storage policies can stay path-scoped.
insert into storage.buckets (id, name, public)
values ('sheet-music', 'sheet-music', false)
on conflict (id) do update set public = false;

create policy "sheet_music_storage_read" on storage.objects
  for select using (
    bucket_id = 'sheet-music'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "sheet_music_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'sheet-music'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "sheet_music_storage_update" on storage.objects
  for update using (
    bucket_id = 'sheet-music'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "sheet_music_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'sheet-music'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage bucket for private practice recordings. Same path-scoping: objects
-- live under '<user-id>/...' so only the owner can read/write their files.
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do update set public = false;

create policy "recordings_storage_read" on storage.objects
  for select using (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "recordings_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "recordings_storage_update" on storage.objects
  for update using (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "recordings_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── Bootstrap trigger: create public.users row on auth signup ─────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  insert into public.subscriptions (user_id, plan)
  values (new.id, 'free');
  insert into public.user_preferences (user_id)
  values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
