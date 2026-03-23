-- Security hardening patch (2026-03-23)
-- Run this in Supabase SQL Editor on existing projects.

-- 1) Force role assignment server-side (no privilege escalation via metadata)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    'allievo',
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email)
  );
  return new;
end;
$$;

-- 2) Tighten RLS checks for workout_sessions
drop policy if exists "Users can insert own sessions" on public.workout_sessions;
create policy "Users can insert own sessions"
  on public.workout_sessions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.workout_sheets ws
      where ws.id = sheet_id and ws.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own sessions" on public.workout_sessions;
create policy "Users can update own sessions"
  on public.workout_sessions for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.workout_sheets ws
      where ws.id = sheet_id and ws.user_id = auth.uid()
    )
  );

-- 3) Tighten RLS checks for set logs
drop policy if exists "Users can insert logs in own sessions" on public.session_set_logs;
create policy "Users can insert logs in own sessions"
  on public.session_set_logs for insert
  with check (
    exists (
      select 1
      from public.workout_sessions ws
      join public.exercises e on e.id = exercise_id
      where ws.id = session_id
        and ws.user_id = auth.uid()
        and e.sheet_id = ws.sheet_id
    )
  );

drop policy if exists "Users can update logs in own sessions" on public.session_set_logs;
create policy "Users can update logs in own sessions"
  on public.session_set_logs for update
  using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_id and ws.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.workout_sessions ws
      join public.exercises e on e.id = exercise_id
      where ws.id = session_id
        and ws.user_id = auth.uid()
        and e.sheet_id = ws.sheet_id
    )
  );

-- 4) Tighten RLS checks for session notes
drop policy if exists "Users can insert notes in own sessions" on public.session_exercise_notes;
create policy "Users can insert notes in own sessions"
  on public.session_exercise_notes for insert
  with check (
    exists (
      select 1
      from public.workout_sessions ws
      join public.exercises e on e.id = exercise_id
      where ws.id = session_id
        and ws.user_id = auth.uid()
        and e.sheet_id = ws.sheet_id
    )
  );

drop policy if exists "Users can update notes in own sessions" on public.session_exercise_notes;
create policy "Users can update notes in own sessions"
  on public.session_exercise_notes for update
  using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_id and ws.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.workout_sessions ws
      join public.exercises e on e.id = exercise_id
      where ws.id = session_id
        and ws.user_id = auth.uid()
        and e.sheet_id = ws.sheet_id
    )
  );

-- 5) Add integrity constraints to avoid duplicate rows
create unique index if not exists uq_session_set_logs_unique_set
  on public.session_set_logs (session_id, exercise_id, set_number);

create unique index if not exists uq_session_exercise_notes_unique_pair
  on public.session_exercise_notes (session_id, exercise_id);
