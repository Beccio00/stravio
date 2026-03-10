-- ============================================
-- Stravio – Supabase Postgres Schema
-- Run this in the Supabase SQL Editor
-- ============================================

-- 0. Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================
-- 1. Profiles table (extends auth.users)
-- ============================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'allievo' check (role in ('coach', 'allievo')),
  display_name text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'allievo'),
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email)
  );
  return new;
end;
$$;

-- Drop existing trigger first (idempotent)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- 2. Workout Sheets
-- ============================================
create table if not exists public.workout_sheets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================
-- 3. Exercises
-- ============================================
create table if not exists public.exercises (
  id          uuid primary key default gen_random_uuid(),
  sheet_id    uuid not null references public.workout_sheets(id) on delete cascade,
  name        text not null,
  notes       text,
  order_index integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ============================================
-- 4. Exercise Sets (template)
-- ============================================
create table if not exists public.exercise_sets (
  id            uuid primary key default gen_random_uuid(),
  exercise_id   uuid not null references public.exercises(id) on delete cascade,
  set_number    integer not null,
  reps          integer not null,
  weight_kg     double precision not null default 0,
  rest_time_sec integer not null default 60
);

-- ============================================
-- 5. Workout Sessions
-- ============================================
create table if not exists public.workout_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  sheet_id     uuid not null references public.workout_sheets(id) on delete cascade,
  started_at   timestamptz not null default now(),
  completed_at timestamptz,
  notes        text
);

-- ============================================
-- 6. Session Set Logs
-- ============================================
create table if not exists public.session_set_logs (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id  uuid not null references public.exercises(id) on delete cascade,
  set_number   integer not null,
  reps         integer not null,
  weight_kg    double precision not null,
  completed_at timestamptz not null default now()
);

-- ============================================
-- 7. Session Exercise Notes
-- ============================================
create table if not exists public.session_exercise_notes (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id  uuid not null references public.exercises(id) on delete cascade,
  notes        text not null,
  updated_at   timestamptz not null default now()
);

-- ============================================
-- 8. Indexes
-- ============================================
create index if not exists idx_workout_sheets_user    on public.workout_sheets(user_id);
create index if not exists idx_exercises_sheet        on public.exercises(sheet_id);
create index if not exists idx_exercise_sets_exercise on public.exercise_sets(exercise_id);
create index if not exists idx_sessions_user          on public.workout_sessions(user_id);
create index if not exists idx_sessions_sheet         on public.workout_sessions(sheet_id);
create index if not exists idx_session_logs_session   on public.session_set_logs(session_id);
create index if not exists idx_session_notes_session  on public.session_exercise_notes(session_id);

-- ============================================
-- 9. Row Level Security (RLS)
-- ============================================

-- Profiles: users can read/update only their own profile
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Workout Sheets: users see only their own sheets
alter table public.workout_sheets enable row level security;

create policy "Users can view own sheets"
  on public.workout_sheets for select
  using (auth.uid() = user_id);

create policy "Users can insert own sheets"
  on public.workout_sheets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sheets"
  on public.workout_sheets for update
  using (auth.uid() = user_id);

create policy "Users can delete own sheets"
  on public.workout_sheets for delete
  using (auth.uid() = user_id);

-- Exercises: inherit access from parent sheet
alter table public.exercises enable row level security;

create policy "Users can view exercises in own sheets"
  on public.exercises for select
  using (
    exists (
      select 1 from public.workout_sheets ws
      where ws.id = sheet_id and ws.user_id = auth.uid()
    )
  );

create policy "Users can insert exercises in own sheets"
  on public.exercises for insert
  with check (
    exists (
      select 1 from public.workout_sheets ws
      where ws.id = sheet_id and ws.user_id = auth.uid()
    )
  );

create policy "Users can update exercises in own sheets"
  on public.exercises for update
  using (
    exists (
      select 1 from public.workout_sheets ws
      where ws.id = sheet_id and ws.user_id = auth.uid()
    )
  );

create policy "Users can delete exercises in own sheets"
  on public.exercises for delete
  using (
    exists (
      select 1 from public.workout_sheets ws
      where ws.id = sheet_id and ws.user_id = auth.uid()
    )
  );

-- Exercise Sets: inherit access from parent exercise → sheet
alter table public.exercise_sets enable row level security;

create policy "Users can view sets in own exercises"
  on public.exercise_sets for select
  using (
    exists (
      select 1 from public.exercises e
      join public.workout_sheets ws on ws.id = e.sheet_id
      where e.id = exercise_id and ws.user_id = auth.uid()
    )
  );

create policy "Users can insert sets in own exercises"
  on public.exercise_sets for insert
  with check (
    exists (
      select 1 from public.exercises e
      join public.workout_sheets ws on ws.id = e.sheet_id
      where e.id = exercise_id and ws.user_id = auth.uid()
    )
  );

create policy "Users can update sets in own exercises"
  on public.exercise_sets for update
  using (
    exists (
      select 1 from public.exercises e
      join public.workout_sheets ws on ws.id = e.sheet_id
      where e.id = exercise_id and ws.user_id = auth.uid()
    )
  );

create policy "Users can delete sets in own exercises"
  on public.exercise_sets for delete
  using (
    exists (
      select 1 from public.exercises e
      join public.workout_sheets ws on ws.id = e.sheet_id
      where e.id = exercise_id and ws.user_id = auth.uid()
    )
  );

-- Workout Sessions: users see only their own
alter table public.workout_sessions enable row level security;

create policy "Users can view own sessions"
  on public.workout_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on public.workout_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on public.workout_sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete own sessions"
  on public.workout_sessions for delete
  using (auth.uid() = user_id);

-- Session Set Logs: inherit access from parent session
alter table public.session_set_logs enable row level security;

create policy "Users can view logs in own sessions"
  on public.session_set_logs for select
  using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_id and ws.user_id = auth.uid()
    )
  );

create policy "Users can insert logs in own sessions"
  on public.session_set_logs for insert
  with check (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_id and ws.user_id = auth.uid()
    )
  );

create policy "Users can update logs in own sessions"
  on public.session_set_logs for update
  using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_id and ws.user_id = auth.uid()
    )
  );

create policy "Users can delete logs in own sessions"
  on public.session_set_logs for delete
  using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_id and ws.user_id = auth.uid()
    )
  );

-- Session Exercise Notes: inherit access from parent session
alter table public.session_exercise_notes enable row level security;

create policy "Users can view notes in own sessions"
  on public.session_exercise_notes for select
  using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_id and ws.user_id = auth.uid()
    )
  );

create policy "Users can insert notes in own sessions"
  on public.session_exercise_notes for insert
  with check (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_id and ws.user_id = auth.uid()
    )
  );

create policy "Users can update notes in own sessions"
  on public.session_exercise_notes for update
  using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_id and ws.user_id = auth.uid()
    )
  );

create policy "Users can delete notes in own sessions"
  on public.session_exercise_notes for delete
  using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_id and ws.user_id = auth.uid()
    )
  );

-- ============================================
-- 10. Updated_at trigger helper
-- ============================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_workout_sheets_updated_at
  before update on public.workout_sheets
  for each row execute function public.set_updated_at();

create trigger set_session_exercise_notes_updated_at
  before update on public.session_exercise_notes
  for each row execute function public.set_updated_at();
