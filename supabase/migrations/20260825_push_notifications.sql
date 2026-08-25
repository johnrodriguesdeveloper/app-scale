alter table push_subscriptions
  add constraint push_subscriptions_endpoint_key unique (endpoint);

-- RLS was already enabled with an equivalent pre-existing policy
-- ("Usuários podem gerenciar suas próprias assinaturas", auth.uid() = user_id,
-- for all) — confirmed against the live database, so no new policy is added
-- here to avoid a redundant duplicate.

create table if not exists notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null check (type in ('shift_reminder', 'availability_deadline_3d', 'availability_deadline_today')),
  target_date date not null,
  sent_at timestamptz not null default now(),
  unique (user_id, type, target_date)
);

alter table notification_log enable row level security;
