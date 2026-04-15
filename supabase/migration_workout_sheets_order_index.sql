-- Run once in Supabase SQL Editor if the project already exists without this column.
-- Preserves previous "newest first" list order as display order (0 = top).

alter table public.workout_sheets
  add column if not exists order_index integer not null default 0;

create index if not exists idx_workout_sheets_user_order
  on public.workout_sheets (user_id, order_index);

-- Backfill: same visual order as before (newest sheet first = order_index 0)
with ranked as (
  select
    id,
    row_number() over (partition by user_id order by created_at desc) - 1 as ord
  from public.workout_sheets
)
update public.workout_sheets ws
set order_index = ranked.ord
from ranked
where ws.id = ranked.id;
