-- Soft delete for sheets and exercises (keeps workout history).
-- Run once in the Supabase SQL Editor on an existing project.
--
-- Before this migration, deleting a sheet cascaded to its sessions and their
-- set logs, and deleting an exercise cascaded to every log of that exercise:
-- removing "Push day" wiped every Push day ever done from the history.
--
-- Now the app only stamps `deleted_at`, so the rows the history points at stay
-- where they are (with their names). The foreign keys from the history to the
-- template no longer cascade, so a hard delete of a sheet or exercise that
-- still has history fails instead of silently taking the history with it.

-- 1) Soft-delete columns
alter table public.workout_sheets
  add column if not exists deleted_at timestamptz;

alter table public.exercises
  add column if not exists deleted_at timestamptz;

-- 2) History → template references: no cascade.
--    DEFERRABLE INITIALLY DEFERRED so the check runs at commit: deleting an
--    auth user still works, because by then the cascade from auth.users has
--    removed the sessions and logs as well as the sheets.
alter table public.workout_sessions
  drop constraint if exists workout_sessions_sheet_id_fkey,
  add constraint workout_sessions_sheet_id_fkey
    foreign key (sheet_id) references public.workout_sheets(id)
    on delete no action deferrable initially deferred;

alter table public.session_set_logs
  drop constraint if exists session_set_logs_exercise_id_fkey,
  add constraint session_set_logs_exercise_id_fkey
    foreign key (exercise_id) references public.exercises(id)
    on delete no action deferrable initially deferred;

alter table public.session_exercise_notes
  drop constraint if exists session_exercise_notes_exercise_id_fkey,
  add constraint session_exercise_notes_exercise_id_fkey
    foreign key (exercise_id) references public.exercises(id)
    on delete no action deferrable initially deferred;
