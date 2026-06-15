-- Andante migration: Sheet Music + Composer Mode
-- Run this on an existing Supabase project. It is intentionally idempotent:
-- tables, columns, indexes, constraints, storage bucket, and policies are
-- created only when missing.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table if not exists public.sheet_music (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  piece_id uuid references public.pieces(id) on delete set null,
  title text not null,
  composer text,
  origin text not null default 'upload',
  source_name text,
  source_url text,
  license text,
  attribution text,
  is_public boolean not null default false,
  created_at timestamptz default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sheet_music_origin_check') then
    alter table public.sheet_music
      add constraint sheet_music_origin_check
      check (origin in ('upload','imslp','pathway','generated')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sheet_music_owner_or_public_check') then
    alter table public.sheet_music
      add constraint sheet_music_owner_or_public_check
      check (user_id is not null or is_public) not valid;
  end if;
end $$;

alter table public.sheet_music validate constraint sheet_music_origin_check;
alter table public.sheet_music validate constraint sheet_music_owner_or_public_check;

create table if not exists public.sheet_music_files (
  id uuid primary key default uuid_generate_v4(),
  sheet_music_id uuid not null references public.sheet_music(id) on delete cascade,
  kind text not null,
  storage_bucket text,
  storage_path text,
  external_url text,
  content_type text,
  size_bytes int,
  display_order int not null default 0,
  created_at timestamptz default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sheet_music_files_kind_check') then
    alter table public.sheet_music_files
      add constraint sheet_music_files_kind_check
      check (kind in ('pdf','image','musicxml','midi','audio-source')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sheet_music_files_location_check') then
    alter table public.sheet_music_files
      add constraint sheet_music_files_location_check
      check (storage_path is not null or external_url is not null) not valid;
  end if;
end $$;

alter table public.sheet_music_files validate constraint sheet_music_files_kind_check;
alter table public.sheet_music_files validate constraint sheet_music_files_location_check;

alter table public.sessions
  add column if not exists session_mode text not null default 'practice',
  add column if not exists entry_pathway_id text,
  add column if not exists entry_requirement_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sessions_session_mode_check') then
    alter table public.sessions
      add constraint sessions_session_mode_check
      check (session_mode in ('practice','composer')) not valid;
  end if;
end $$;

alter table public.sessions validate constraint sessions_session_mode_check;

alter table public.pathway_requirements
  add column if not exists sheet_music_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pathway_requirements_sheet_music_id_fkey'
  ) then
    alter table public.pathway_requirements
      add constraint pathway_requirements_sheet_music_id_fkey
      foreign key (sheet_music_id) references public.sheet_music(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'sessions_entry_pathway_fk'
  ) then
    alter table public.sessions
      add constraint sessions_entry_pathway_fk
      foreign key (entry_pathway_id) references public.pathways(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'sessions_entry_requirement_fk'
  ) then
    alter table public.sessions
      add constraint sessions_entry_requirement_fk
      foreign key (entry_requirement_id) references public.pathway_requirements(id) on delete set null;
  end if;
end $$;

create table if not exists public.session_sheet_music (
  session_id uuid not null references public.sessions(id) on delete cascade,
  sheet_music_id uuid not null references public.sheet_music(id) on delete cascade,
  role text not null default 'primary',
  created_at timestamptz default now(),
  primary key (session_id, sheet_music_id)
);

create table if not exists public.composer_jobs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  source_recording_id uuid references public.recordings(id) on delete set null,
  generated_sheet_music_id uuid references public.sheet_music(id) on delete set null,
  status text not null default 'queued',
  worker_run_id text,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'composer_jobs_status_check') then
    alter table public.composer_jobs
      add constraint composer_jobs_status_check
      check (status in ('queued','processing','completed','failed')) not valid;
  end if;
end $$;

alter table public.composer_jobs validate constraint composer_jobs_status_check;

create index if not exists sheet_music_user_origin on public.sheet_music(user_id, origin, created_at desc);
create index if not exists sheet_music_files_music on public.sheet_music_files(sheet_music_id, display_order);
create index if not exists session_sheet_music_session on public.session_sheet_music(session_id);
create index if not exists composer_jobs_status on public.composer_jobs(status, created_at);

alter table public.sheet_music enable row level security;
alter table public.sheet_music_files enable row level security;
alter table public.session_sheet_music enable row level security;
alter table public.composer_jobs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sheet_music' and policyname = 'sheet_music_read') then
    create policy "sheet_music_read" on public.sheet_music
      for select using (is_public or auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sheet_music' and policyname = 'sheet_music_insert_own') then
    create policy "sheet_music_insert_own" on public.sheet_music
      for insert with check (auth.uid() = user_id and is_public = false);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sheet_music' and policyname = 'sheet_music_update_own') then
    create policy "sheet_music_update_own" on public.sheet_music
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id and is_public = false);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sheet_music' and policyname = 'sheet_music_delete_own') then
    create policy "sheet_music_delete_own" on public.sheet_music
      for delete using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sheet_music_files' and policyname = 'sheet_music_files_read') then
    create policy "sheet_music_files_read" on public.sheet_music_files
      for select using (
        sheet_music_id in (
          select id from public.sheet_music
          where is_public or user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sheet_music_files' and policyname = 'sheet_music_files_insert_own') then
    create policy "sheet_music_files_insert_own" on public.sheet_music_files
      for insert with check (
        sheet_music_id in (select id from public.sheet_music where user_id = auth.uid())
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sheet_music_files' and policyname = 'sheet_music_files_update_own') then
    create policy "sheet_music_files_update_own" on public.sheet_music_files
      for update using (
        sheet_music_id in (select id from public.sheet_music where user_id = auth.uid())
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sheet_music_files' and policyname = 'sheet_music_files_delete_own') then
    create policy "sheet_music_files_delete_own" on public.sheet_music_files
      for delete using (
        sheet_music_id in (select id from public.sheet_music where user_id = auth.uid())
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'session_sheet_music' and policyname = 'session_sheet_music_own') then
    create policy "session_sheet_music_own" on public.session_sheet_music
      for all using (
        session_id in (select id from public.sessions where user_id = auth.uid())
      ) with check (
        session_id in (select id from public.sessions where user_id = auth.uid())
        and sheet_music_id in (
          select id from public.sheet_music where is_public or user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'composer_jobs' and policyname = 'composer_jobs_own') then
    create policy "composer_jobs_own" on public.composer_jobs
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('sheet-music', 'sheet-music', false)
on conflict (id) do update set public = false;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'sheet_music_storage_read') then
    create policy "sheet_music_storage_read" on storage.objects
      for select using (
        bucket_id = 'sheet-music'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'sheet_music_storage_insert') then
    create policy "sheet_music_storage_insert" on storage.objects
      for insert with check (
        bucket_id = 'sheet-music'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'sheet_music_storage_update') then
    create policy "sheet_music_storage_update" on storage.objects
      for update using (
        bucket_id = 'sheet-music'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'sheet_music_storage_delete') then
    create policy "sheet_music_storage_delete" on storage.objects
      for delete using (
        bucket_id = 'sheet-music'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;
