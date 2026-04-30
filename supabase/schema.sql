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

-- ─── Sessions ───────────────────────────────────────────────────────────────
create table public.sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_sec int,
  focus_type text check (focus_type in ('repertoire','scales','etudes','sight-reading')),
  notes text,
  created_at timestamptz default now()
);

create table public.session_pieces (
  session_id uuid not null references public.sessions(id) on delete cascade,
  piece_id uuid not null references public.pieces(id) on delete cascade,
  primary key (session_id, piece_id)
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
  position int not null,
  label text not null,                       -- 'Solo from NYSSMA Manual Lvl 6'
  piece_label text                           -- 'Bach Sonata No. 1 in G minor'
);

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
create index session_pieces_session on public.session_pieces(session_id);
create index auditions_user_date on public.auditions(user_id, date);
create index recordings_user_date on public.recordings(user_id, created_at desc);
create index takes_user_status on public.takes(user_id, status);
create index takes_requirement on public.takes(requirement_id);
create index room_seats_room on public.room_seats(room_id);
create index pathway_progress_user on public.pathway_progress(user_id);
create index assignments_student on public.assignments(student_id, due_date);

-- ─── RLS — enable on every user-scoped table ────────────────────────────────
alter table public.users enable row level security;
alter table public.pieces enable row level security;
alter table public.sessions enable row level security;
alter table public.session_pieces enable row level security;
alter table public.auditions enable row level security;
alter table public.pathway_enrollments enable row level security;
alter table public.pathway_progress enable row level security;
alter table public.recordings enable row level security;
alter table public.recording_annotations enable row level security;
alter table public.takes enable row level security;
alter table public.take_feedback enable row level security;
alter table public.rooms enable row level security;
alter table public.room_seats enable row level security;
alter table public.kudos enable row level security;
alter table public.subscriptions enable row level security;
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
create policy "users_self"     on public.users
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "users_read_basic" on public.users
  for select to authenticated using (true);  -- name + region visible to cohort

create policy "pieces_own"     on public.pieces
  for all using (auth.uid() = user_id);

create policy "sessions_own"   on public.sessions
  for all using (auth.uid() = user_id);

create policy "session_pieces_own" on public.session_pieces
  for all using (
    session_id in (select id from public.sessions where user_id = auth.uid())
  );

create policy "auditions_own"  on public.auditions
  for all using (auth.uid() = user_id);

create policy "enrollments_own" on public.pathway_enrollments
  for all using (auth.uid() = user_id);

create policy "progress_own"   on public.pathway_progress
  for all using (auth.uid() = user_id);

create policy "recordings_own" on public.recordings
  for all using (auth.uid() = user_id);

create policy "annotations_read" on public.recording_annotations
  for select using (
    recording_id in (select id from public.recordings where user_id = auth.uid())
  );
create policy "annotations_write" on public.recording_annotations
  for insert with check (created_by = auth.uid());

-- Takes: owner full access, judges read pending takes assigned to them (V2)
create policy "takes_own"      on public.takes
  for all using (auth.uid() = user_id);

create policy "take_feedback_read" on public.take_feedback
  for select using (
    take_id in (select id from public.takes where user_id = auth.uid())
  );
create policy "take_feedback_write" on public.take_feedback
  for insert with check (auth.uid() = reviewer_id);

-- Rooms: any authenticated user can browse + join open rooms
create policy "rooms_read"     on public.rooms for select to authenticated using (true);
create policy "rooms_host_write" on public.rooms
  for insert with check (auth.uid() = host_id);
create policy "rooms_host_update" on public.rooms
  for update using (auth.uid() = host_id);

create policy "seats_self"     on public.room_seats
  for all using (auth.uid() = user_id);

-- Kudos: anyone can give, recipient sees inbound
create policy "kudos_send"     on public.kudos
  for insert with check (auth.uid() = from_user_id);
create policy "kudos_read"     on public.kudos
  for select using (auth.uid() in (from_user_id, to_user_id));

-- Subscriptions: read-only to the user
create policy "sub_read"       on public.subscriptions
  for select using (auth.uid() = user_id);

-- Teachers
create policy "teacher_self"   on public.teachers
  for all using (auth.uid() = user_id);

create policy "teacher_students_teacher" on public.teacher_students
  for all using (auth.uid() = teacher_id);
create policy "teacher_students_student" on public.teacher_students
  for select using (auth.uid() = student_id);

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
create policy "assignments_teacher" on public.assignments
  for all using (auth.uid() = teacher_id);
create policy "assignments_student" on public.assignments
  for select using (auth.uid() = student_id);

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
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
