alter table push_subscriptions
  add constraint push_subscriptions_endpoint_key unique (endpoint);

alter table push_subscriptions enable row level security;

drop policy if exists "Users can manage their own push subscriptions" on push_subscriptions;
create policy "Users can manage their own push subscriptions"
  on push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null check (type in ('shift_reminder', 'availability_deadline_3d', 'availability_deadline_today')),
  target_date date not null,
  sent_at timestamptz not null default now(),
  unique (user_id, type, target_date)
);

alter table notification_log enable row level security;
