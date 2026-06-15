-- ────────────────────────────────────────────────────────────────────────────
-- RLS hardening — paste into the Supabase SQL editor and run.
-- Idempotent: safe to run on a DB created from schema.sql, and safe to re-run.
-- Closes the gaps that matter once the public anon key is live in Vercel.
-- ────────────────────────────────────────────────────────────────────────────

-- 1) Stop leaking email. The old "users_read_basic" policy let any signed-in
--    user select EVERY column of EVERY user — including email. Replace it with
--    a view that exposes only safe, cohort-visible profile fields.
drop policy if exists "users_read_basic" on public.users;
drop policy if exists "users_self" on public.users;
drop policy if exists "users_self_read" on public.users;
drop policy if exists "users_self_update" on public.users;

create policy "users_self_read" on public.users
  for select using (auth.uid() = id);
create policy "users_self_update" on public.users
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select u.role from public.users u where u.id = auth.uid())
  );
revoke update (role) on public.users from authenticated;

create or replace view public.profiles
  with (security_invoker = false) as
  select id, display_name, instrument, region_flag, created_at
  from public.users;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

-- 1b) Paid-feature entitlement must be enforced at the DB boundary too. Route
--     middleware hides Pro screens, but the Supabase anon key can still talk to
--     RLS-protected tables directly unless those policies also check plan state.
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

-- 2) Close the teacher self-accept escalation. Previously a teacher row had
--    FOR ALL on teacher_students, so any user could create a teachers row,
--    insert (teacher_id = self, student_id = <victim>, accepted_at = now()),
--    and then read the victim's sessions + pieces via teacher_reads_student_*.
--    Acceptance must be the student's action only.
drop policy if exists "teacher_students_teacher" on public.teacher_students;
drop policy if exists "teacher_students_student" on public.teacher_students;
drop policy if exists "teacher_students_teacher_invite" on public.teacher_students;
drop policy if exists "teacher_students_teacher_read" on public.teacher_students;
drop policy if exists "teacher_students_teacher_remove" on public.teacher_students;
drop policy if exists "teacher_students_student_read" on public.teacher_students;
drop policy if exists "teacher_students_student_accept" on public.teacher_students;

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

-- 3) Annotations: you can only annotate recordings you own.
drop policy if exists "annotations_write" on public.recording_annotations;
create policy "annotations_write" on public.recording_annotations
  for insert with check (
    created_by = auth.uid()
    and public.has_paid_entitlement(auth.uid())
    and recording_id in (select id from public.recordings where user_id = auth.uid())
  );

-- 4) Define the private recordings storage bucket + path-scoped policies. The
--    app stores clips under '<user-id>/...'; without this the bucket is either
--    missing or (if hand-created public) world-readable.
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do update set public = false;

drop policy if exists "recordings_storage_read"   on storage.objects;
drop policy if exists "recordings_storage_insert" on storage.objects;
drop policy if exists "recordings_storage_update" on storage.objects;
drop policy if exists "recordings_storage_delete" on storage.objects;
create policy "recordings_storage_read" on storage.objects
  for select using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "recordings_storage_insert" on storage.objects
  for insert with check (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "recordings_storage_update" on storage.objects
  for update using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "recordings_storage_delete" on storage.objects
  for delete using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);

insert into storage.buckets (id, name, public)
values ('sheet-music', 'sheet-music', false)
on conflict (id) do update set public = false;

drop policy if exists "sheet_music_storage_read"   on storage.objects;
drop policy if exists "sheet_music_storage_insert" on storage.objects;
drop policy if exists "sheet_music_storage_update" on storage.objects;
drop policy if exists "sheet_music_storage_delete" on storage.objects;
create policy "sheet_music_storage_read" on storage.objects
  for select using (bucket_id = 'sheet-music' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "sheet_music_storage_insert" on storage.objects
  for insert with check (bucket_id = 'sheet-music' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "sheet_music_storage_update" on storage.objects
  for update using (bucket_id = 'sheet-music' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "sheet_music_storage_delete" on storage.objects
  for delete using (bucket_id = 'sheet-music' and (storage.foldername(name))[1] = auth.uid()::text);

-- 5) Cross-table ownership hardening. Direct Supabase clients must not be able
--    to create rows that they own but that point at another user's piece,
--    session, storage object, recording, or take.
drop policy if exists "pieces_own" on public.pieces;
create policy "pieces_own" on public.pieces
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "sheet_music_insert_own" on public.sheet_music;
drop policy if exists "sheet_music_update_own" on public.sheet_music;
drop policy if exists "sheet_music_delete_own" on public.sheet_music;
create policy "sheet_music_insert_own" on public.sheet_music
  for insert with check (
    auth.uid() = user_id
    and is_public = false
    and origin in ('upload','imslp')
    and (
      piece_id is null
      or piece_id in (select id from public.pieces where user_id = auth.uid())
    )
  );
create policy "sheet_music_update_own" on public.sheet_music
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and is_public = false
    and (
      piece_id is null
      or piece_id in (select id from public.pieces where user_id = auth.uid())
    )
  );
create policy "sheet_music_delete_own" on public.sheet_music
  for delete using (auth.uid() = user_id);

drop policy if exists "sheet_music_files_insert_own" on public.sheet_music_files;
drop policy if exists "sheet_music_files_update_own" on public.sheet_music_files;
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

drop policy if exists "sessions_own" on public.sessions;
create policy "sessions_own" on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "session_pieces_own" on public.session_pieces;
create policy "session_pieces_own" on public.session_pieces
  for all using (
    session_id in (select id from public.sessions where user_id = auth.uid())
  ) with check (
    session_id in (select id from public.sessions where user_id = auth.uid())
    and piece_id in (select id from public.pieces where user_id = auth.uid())
  );

drop policy if exists "session_sheet_music_own" on public.session_sheet_music;
create policy "session_sheet_music_own" on public.session_sheet_music
  for all using (
    session_id in (select id from public.sessions where user_id = auth.uid())
  ) with check (
    session_id in (select id from public.sessions where user_id = auth.uid())
    and sheet_music_id in (
      select id from public.sheet_music where is_public or user_id = auth.uid()
    )
  );

drop policy if exists "auditions_own" on public.auditions;
create policy "auditions_own" on public.auditions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "enrollments_own" on public.pathway_enrollments;
create policy "enrollments_own" on public.pathway_enrollments
  for all using (
    auth.uid() = user_id and public.has_paid_entitlement(auth.uid())
  ) with check (
    auth.uid() = user_id and public.has_paid_entitlement(auth.uid())
  );

drop policy if exists "progress_own" on public.pathway_progress;
create policy "progress_own" on public.pathway_progress
  for all using (
    auth.uid() = user_id and public.has_paid_entitlement(auth.uid())
  ) with check (
    auth.uid() = user_id and public.has_paid_entitlement(auth.uid())
  );

drop policy if exists "recordings_own" on public.recordings;
create policy "recordings_own" on public.recordings
  for all using (
    auth.uid() = user_id and public.has_paid_entitlement(auth.uid())
  ) with check (
    auth.uid() = user_id
    and public.has_paid_entitlement(auth.uid())
    and storage_path like (auth.uid()::text || '/%')
  );

drop policy if exists "annotations_read" on public.recording_annotations;
create policy "annotations_read" on public.recording_annotations
  for select using (
    public.has_paid_entitlement(auth.uid())
    and recording_id in (select id from public.recordings where user_id = auth.uid())
  );

drop policy if exists "composer_jobs_own" on public.composer_jobs;
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

drop policy if exists "takes_own" on public.takes;
drop policy if exists "takes_own_read" on public.takes;
drop policy if exists "takes_own_insert" on public.takes;
drop policy if exists "takes_own_withdraw" on public.takes;
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

drop policy if exists "take_feedback_write" on public.take_feedback;

drop policy if exists "rooms_host_update" on public.rooms;
drop policy if exists "rooms_read" on public.rooms;
drop policy if exists "rooms_host_write" on public.rooms;
create policy "rooms_read" on public.rooms
  for select to authenticated using (public.has_paid_entitlement(auth.uid()));
create policy "rooms_host_write" on public.rooms
  for insert with check (auth.uid() = host_id and public.has_paid_entitlement(auth.uid()));
create policy "rooms_host_update" on public.rooms
  for update using (
    auth.uid() = host_id and public.has_paid_entitlement(auth.uid())
  ) with check (
    auth.uid() = host_id and public.has_paid_entitlement(auth.uid())
  );

drop policy if exists "seats_self" on public.room_seats;
drop policy if exists "seats_read" on public.room_seats;
drop policy if exists "seats_join" on public.room_seats;
drop policy if exists "seats_leave" on public.room_seats;
create policy "seats_read" on public.room_seats
  for select to authenticated using (public.has_paid_entitlement(auth.uid()));
create policy "seats_join" on public.room_seats
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
create policy "seats_leave" on public.room_seats
  for delete using (auth.uid() = user_id);

drop policy if exists "kudos_send" on public.kudos;
drop policy if exists "kudos_read" on public.kudos;
create policy "kudos_send" on public.kudos
  for insert with check (
    auth.uid() = from_user_id and public.has_paid_entitlement(auth.uid())
  );
create policy "kudos_read" on public.kudos
  for select using (
    auth.uid() in (from_user_id, to_user_id)
    and public.has_paid_entitlement(auth.uid())
  );

-- 6) Studio/teacher writes require an actual teacher role and accepted student
--    relationship. The UI already checks this; these policies make the DB agree.
drop policy if exists "teacher_self" on public.teachers;
drop policy if exists "teacher_self_read" on public.teachers;
drop policy if exists "teacher_self_insert" on public.teachers;
drop policy if exists "teacher_self_update" on public.teachers;
drop policy if exists "teacher_self_delete" on public.teachers;
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

drop policy if exists "assignments_teacher" on public.assignments;
drop policy if exists "assignments_teacher_read" on public.assignments;
drop policy if exists "assignments_teacher_insert" on public.assignments;
drop policy if exists "assignments_teacher_update" on public.assignments;
drop policy if exists "assignments_teacher_delete" on public.assignments;
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

drop policy if exists "push_subscriptions_self" on public.push_subscriptions;
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

-- ── Verification queries (run these after; each should return ZERO rows) ─────

-- (a) Any public table with RLS turned OFF is fully exposed via the anon key:
-- select tablename from pg_tables
--   where schemaname = 'public' and rowsecurity = false;

-- (b) Any public table with RLS on but NO policy denies all — usually a bug,
--     but confirm none are tables you expect to be writable:
-- select t.tablename from pg_tables t
--   left join pg_policies p on p.schemaname = t.schemaname and p.tablename = t.tablename
--   where t.schemaname = 'public' and t.rowsecurity and p.policyname is null;
