alter table availability_routine
  add column if not exists updated_at timestamptz not null default now();

alter table availability_exceptions
  add column if not exists updated_at timestamptz not null default now();

update availability_routine set updated_at = created_at where updated_at is distinct from created_at;
update availability_exceptions set updated_at = created_at where updated_at is distinct from created_at;

create or replace function set_availability_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists availability_routine_set_updated_at on availability_routine;
create trigger availability_routine_set_updated_at
  before update on availability_routine
  for each row execute function set_availability_updated_at();

drop trigger if exists availability_exceptions_set_updated_at on availability_exceptions;
create trigger availability_exceptions_set_updated_at
  before update on availability_exceptions
  for each row execute function set_availability_updated_at();
