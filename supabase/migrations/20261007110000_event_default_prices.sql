-- Tarifs par défaut des événements (back-office > Paramètres), choisis par ceux qui créent les
-- événements (STAGE_CREATE). Ils pré-remplissent le formulaire de création, qui reste modifiable.
-- Montants en centimes ; vide = pas de valeur proposée (pour le stage « tous les jours » : le
-- formulaire propose alors « tarif d'un jour × nombre de jours »).

create table public.event_default_prices (
  -- Une seule ligne.
  id boolean primary key default true check (id),
  meal_adult_cents integer check (meal_adult_cents > 0),
  meal_child_cents integer check (meal_child_cents > 0),
  stage_day_cents integer check (stage_day_cents > 0),
  stage_all_days_cents integer check (stage_all_days_cents > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.accounts (id) on delete set null
);

comment on table public.event_default_prices is 'Tarifs proposés à la création d''un événement (une ligne).';

insert into public.event_default_prices (id) values (true);

create trigger event_default_prices_set_updated_at
  before update on public.event_default_prices
  for each row execute function public.set_updated_at();

-- Auteur de la dernière modification.
create function public.set_updated_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_by = auth.uid();
  return new;
end;
$$;

revoke execute on function public.set_updated_by() from public, anon, authenticated;

create trigger event_default_prices_set_updated_by
  before update on public.event_default_prices
  for each row execute function public.set_updated_by();

create trigger event_default_prices_audit
  after update on public.event_default_prices
  for each row execute function public.audit_change();

revoke all on public.event_default_prices from anon, authenticated;
grant select on public.event_default_prices to authenticated;
grant update (meal_adult_cents, meal_child_cents, stage_day_cents, stage_all_days_cents)
  on public.event_default_prices to authenticated;

alter table public.event_default_prices enable row level security;

create policy "Lire les tarifs par défaut (responsables des événements)"
  on public.event_default_prices for select to authenticated
  using ((select public.has_permission('STAGE_CREATE')) or (select public.has_permission('STAGE_UPDATE')));

create policy "Modifier les tarifs par défaut"
  on public.event_default_prices for update to authenticated
  using ((select public.has_permission('STAGE_CREATE')))
  with check ((select public.has_permission('STAGE_CREATE')));

-- Journal : ces modifications sont visibles des responsables des événements.
create or replace function public.readable_audit_targets()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct target), '{}')
  from (
    values
      ('members', 'MEMBER_VIEW'), ('members', 'MEMBER_MANAGE'),
      ('roles', 'USER_MANAGE'), ('roles', 'ROLE_MANAGE'),
      ('role_permissions', 'USER_MANAGE'), ('role_permissions', 'ROLE_MANAGE'),
      ('account_roles', 'USER_MANAGE'), ('account_roles', 'ROLE_MANAGE'),
      ('accounts', 'USER_MANAGE'), ('accounts', 'ROLE_MANAGE'),
      ('audit_logs', 'USER_MANAGE'), ('audit_logs', 'ROLE_MANAGE'),
      ('news', 'NEWS_CREATE'), ('news', 'NEWS_UPDATE'), ('news', 'NEWS_DELETE'),
      ('schedule_periods', 'SCHEDULE_CREATE'), ('schedule_periods', 'SCHEDULE_UPDATE'), ('schedule_periods', 'SCHEDULE_DELETE'),
      ('schedules', 'SCHEDULE_CREATE'), ('schedules', 'SCHEDULE_UPDATE'), ('schedules', 'SCHEDULE_DELETE'),
      ('schedule_cancellations', 'SCHEDULE_CREATE'), ('schedule_cancellations', 'SCHEDULE_UPDATE'),
      ('schedule_cancellations', 'SCHEDULE_DELETE'),
      ('products', 'VOLANT_MANAGE'), ('products', 'VOLANT_VIEW_SALES'),
      ('stages', 'STAGE_CREATE'), ('stages', 'STAGE_UPDATE'), ('stages', 'STAGE_DELETE'), ('stages', 'STAGE_VIEW_REGISTRATIONS'),
      ('stage_prices', 'STAGE_CREATE'), ('stage_prices', 'STAGE_UPDATE'), ('stage_prices', 'STAGE_DELETE'),
      ('stage_prices', 'STAGE_VIEW_REGISTRATIONS'),
      ('event_default_prices', 'STAGE_CREATE'), ('event_default_prices', 'STAGE_UPDATE')
  ) as mapping (target, permission)
  where public.has_permission(permission);
$$;
