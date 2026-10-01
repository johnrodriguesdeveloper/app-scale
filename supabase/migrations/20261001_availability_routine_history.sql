-- availability_routine only stores each member's CURRENT weekly routine, so a
-- past month's availability (for days without a specific-date exception) was
-- being computed from today's routine instead of the one the member had back
-- then. This adds an append-only history of routine changes; the app reads
-- the routine "as of" a month's edit deadline from it
-- (see src/features/availability/routineHistory.ts).

create table if not exists public.availability_routine_history (
  -- identity (not uuid) so rows written in the same transaction (same now())
  -- still have a stable, insertion-ordered tie-breaker.
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  service_day_id uuid not null references public.service_days(id) on delete cascade,
  is_available boolean,
  -- true when the routine row was deleted: from valid_from on, the member has
  -- no routine for that service day (i.e. back to the default, available).
  is_deleted boolean not null default false,
  valid_from timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists availability_routine_history_user_valid_from_idx
  on public.availability_routine_history (user_id, valid_from);

-- ---------------------------------------------------------------------------
-- Trigger: every insert / effective update / delete on availability_routine
-- appends a history row. The app only ever upserts routines (insert, or
-- update on conflict user_id,service_day_id), but deletes are recorded too in
-- case they happen (manual cleanup, cascades).
-- security definer: clients have no insert policy on the history table.
-- ---------------------------------------------------------------------------
create or replace function public.log_availability_routine_history()
returns trigger
language plpgsql
security definer
-- every object below is schema-qualified; an empty search_path keeps
-- pg_temp / caller-created objects from shadowing them.
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    -- Skip when the delete is a cascade from the profile / service day being
    -- removed: the history rows go away with them, and inserting here would
    -- violate the foreign keys.
    if exists (select 1 from public.profiles where id = old.user_id)
       and exists (select 1 from public.service_days where id = old.service_day_id) then
      insert into public.availability_routine_history (user_id, service_day_id, is_available, is_deleted, valid_from)
      values (old.user_id, old.service_day_id, old.is_available, true, now());
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE'
     and old.user_id = new.user_id
     and old.service_day_id = new.service_day_id
     and old.is_available is not distinct from new.is_available then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and (old.user_id <> new.user_id or old.service_day_id <> new.service_day_id) then
    -- The row moved to another (user, service day): the old pair no longer has a routine.
    insert into public.availability_routine_history (user_id, service_day_id, is_available, is_deleted, valid_from)
    values (old.user_id, old.service_day_id, old.is_available, true, now());
  end if;

  insert into public.availability_routine_history (user_id, service_day_id, is_available, is_deleted, valid_from)
  values (new.user_id, new.service_day_id, new.is_available, false, now());
  return new;
end;
$$;

drop trigger if exists availability_routine_history_log on public.availability_routine;
create trigger availability_routine_history_log
  after insert or update or delete on public.availability_routine
  for each row execute function public.log_availability_routine_history();

-- ---------------------------------------------------------------------------
-- Backfill: one row per existing routine row, valid_from = '-infinity'.
-- We don't know when each current value was actually set (created_at is only
-- when the row was first inserted; later updates overwrote it), so we treat
-- the current value as having always been in effect. That way months before
-- any recorded change resolve to the current known routine — exactly what the
-- app showed before this migration — instead of guessing. Idempotent: skips
-- pairs that already have history.
-- ---------------------------------------------------------------------------
insert into public.availability_routine_history (user_id, service_day_id, is_available, is_deleted, valid_from, created_at)
select r.user_id, r.service_day_id, r.is_available, false, '-infinity'::timestamptz, now()
from public.availability_routine r
where not exists (
  select 1 from public.availability_routine_history h
  where h.user_id = r.user_id and h.service_day_id = r.service_day_id
);

-- ---------------------------------------------------------------------------
-- RLS: read-only for clients (writes only happen through the trigger).
-- A member reads their own history; global admins/masters and leaders of any
-- department (or ancestor department, via is_department_leader_or_ancestor
-- from 20260901_department_leader_ancestor_rls.sql) the member belongs to can
-- read it for the department report.
-- ---------------------------------------------------------------------------
alter table public.availability_routine_history enable row level security;

-- Defense in depth: RLS already rejects writes (no write policies), but
-- TRUNCATE is not subject to RLS and Supabase grants ALL to these roles by
-- default. The security-definer trigger is unaffected.
revoke insert, update, delete, truncate on public.availability_routine_history from anon, authenticated;

drop policy if exists "Usuários veem o próprio histórico de rotina" on public.availability_routine_history;
create policy "Usuários veem o próprio histórico de rotina"
  on public.availability_routine_history for select
  using (user_id = auth.uid());

drop policy if exists "Líderes e admins veem o histórico de rotina dos voluntários" on public.availability_routine_history;
create policy "Líderes e admins veem o histórico de rotina dos voluntários"
  on public.availability_routine_history for select
  using (
    (exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and (profiles.org_role = 'admin' or profiles.org_role = 'master')
    ))
    or exists (
      select 1 from public.department_members dm
      where dm.user_id = availability_routine_history.user_id
        and public.is_department_leader_or_ancestor(dm.department_id, auth.uid())
    )
  );
