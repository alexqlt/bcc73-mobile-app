-- P4-01, P4-02, P4-07, P4-08 — Planning (APP.md §8 « Le planning » et §9 « Import de l'image »).
--
-- Le planning est structuré, pas une simple image :
-- - une période (schedule_periods) couvre des dates : planning normal (la saison) ou vacances ;
--   pendant des vacances, la période de vacances remplace le planning normal ;
-- - un créneau récurrent (schedules avec period_id + weekday) se répète chaque semaine de sa période ;
-- - un créneau exceptionnel (schedules avec date) n'a lieu qu'un jour ;
-- - une annulation (schedule_cancellations) supprime un créneau récurrent pour une date donnée.
-- La fonction planning(du, au) donne les créneaux réels de chaque jour.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.schedule_period_kind as enum (
  'normal',   -- planning habituel de la saison
  'holidays'  -- vacances scolaires : remplace le planning normal sur ses dates
);

create type public.schedule_type as enum (
  'free_play', -- jeu libre
  'training',  -- entraînement
  'other'      -- autre (tournoi interne, assemblée générale…)
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.schedule_periods (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  kind public.schedule_period_kind not null default 'normal',
  start_date date not null,
  end_date date not null,
  -- P4-08 : image du planning (bucket planning-images), affichée en complément.
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

comment on table public.schedule_periods is
  'Période du planning (saison normale ou vacances). Les vacances l''emportent sur le planning normal.';

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  -- Créneau récurrent : période + jour de la semaine (1 = lundi … 7 = dimanche, ISO).
  period_id uuid references public.schedule_periods (id) on delete cascade,
  weekday smallint check (weekday between 1 and 7),
  -- Créneau exceptionnel : une seule date.
  date date,
  start_time time not null,
  end_time time not null,
  type public.schedule_type not null,
  title text not null check (char_length(trim(title)) between 1 and 100),
  location text check (char_length(trim(location)) <= 150),
  -- Annulation d'un créneau exceptionnel (les récurrents passent par schedule_cancellations).
  is_cancelled boolean not null default false,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  check (
    (period_id is not null and weekday is not null and date is null and not is_cancelled)
    or (period_id is null and weekday is null and date is not null)
  )
);

comment on table public.schedules is
  'Créneau : récurrent (period_id + weekday) ou exceptionnel (date).';

create index schedules_period_id_idx on public.schedules (period_id, weekday);
create index schedules_date_idx on public.schedules (date) where date is not null;
create index schedule_periods_dates_idx on public.schedule_periods (start_date, end_date);

create table public.schedule_cancellations (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules (id) on delete cascade,
  date date not null,
  reason text check (char_length(trim(reason)) <= 200),
  created_at timestamptz not null default now(),
  unique (schedule_id, date)
);

comment on table public.schedule_cancellations is
  'Créneau récurrent annulé pour une date (gymnase indisponible, compétition…).';

create index schedule_cancellations_date_idx on public.schedule_cancellations (date);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger schedule_periods_set_updated_at
  before update on public.schedule_periods
  for each row execute function public.set_updated_at();

create trigger schedules_set_updated_at
  before update on public.schedules
  for each row execute function public.set_updated_at();

-- Une annulation ne vaut que pour un créneau récurrent, un jour où il a lieu.
create function public.check_schedule_cancellation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  slot record;
begin
  select s.weekday, p.start_date, p.end_date into slot
  from public.schedules s
  join public.schedule_periods p on p.id = s.period_id
  where s.id = new.schedule_id;

  if not found then
    raise exception 'Seul un créneau récurrent peut être annulé pour une date.' using errcode = 'P0001';
  end if;
  if extract(isodow from new.date) <> slot.weekday then
    raise exception 'Ce créneau n''a pas lieu ce jour de la semaine.' using errcode = 'P0001';
  end if;
  if new.date not between slot.start_date and slot.end_date then
    raise exception 'Cette date est en dehors de la période du créneau.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger schedule_cancellations_check
  before insert or update on public.schedule_cancellations
  for each row execute function public.check_schedule_cancellation();

create trigger schedule_periods_audit
  after insert or update or delete on public.schedule_periods
  for each row execute function public.audit_change();

create trigger schedules_audit
  after insert or update or delete on public.schedules
  for each row execute function public.audit_change();

create trigger schedule_cancellations_audit
  after insert or update or delete on public.schedule_cancellations
  for each row execute function public.audit_change();

revoke execute on function public.check_schedule_cancellation() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- P4-02 : quel planning s'applique
-- ---------------------------------------------------------------------------

-- Période d'un jour : les vacances d'abord, puis la période qui a commencé le plus récemment.
create function public.schedule_period_on(day date)
returns setof public.schedule_periods
language sql
stable
set search_path = ''
as $$
  select p.*
  from public.schedule_periods p
  where day between p.start_date and p.end_date
  order by (p.kind = 'holidays') desc, p.start_date desc, p.created_at desc
  limit 1;
$$;

-- Créneaux réels de chaque jour entre deux dates (62 jours maximum), dans l'ordre chronologique.
create function public.planning(from_date date, to_date date)
returns table (
  schedule_id uuid,
  day date,
  start_time time,
  end_time time,
  type public.schedule_type,
  title text,
  location text,
  is_exceptional boolean,
  is_cancelled boolean,
  cancellation_reason text,
  period_id uuid,
  period_name text,
  period_kind public.schedule_period_kind
)
language plpgsql
stable
set search_path = ''
as $$
#variable_conflict use_column
begin
  if to_date < from_date or to_date - from_date > 62 then
    raise exception 'Période demandée invalide (62 jours maximum).' using errcode = 'P0001';
  end if;

  return query
    with days as (
      select d::date as day
      from generate_series(from_date, to_date, interval '1 day') as d
    ),
    active as (
      select days.day, p.id, p.name, p.kind
      from days
      cross join lateral public.schedule_period_on(days.day) as p
    )
    select s.id, a.day, s.start_time, s.end_time, s.type, s.title, s.location,
           false, c.id is not null, c.reason, a.id, a.name, a.kind
    from active a
    join public.schedules s on s.period_id = a.id and s.weekday = extract(isodow from a.day)
    left join public.schedule_cancellations c on c.schedule_id = s.id and c.date = a.day
    union all
    select s.id, s.date, s.start_time, s.end_time, s.type, s.title, s.location,
           true, s.is_cancelled, s.cancellation_reason, a.id, a.name, a.kind
    from public.schedules s
    left join active a on a.day = s.date
    where s.date between from_date and to_date
    order by 2, 3, 4, 6;
end;
$$;

revoke execute on function public.schedule_period_on(date) from public, anon;
revoke execute on function public.planning(date, date) from public, anon;
grant execute on function public.schedule_period_on(date) to authenticated;
grant execute on function public.planning(date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Droits et RLS : tout adhérent connecté lit le planning, les responsables le modifient
-- ---------------------------------------------------------------------------

revoke all on public.schedule_periods, public.schedules, public.schedule_cancellations from anon, authenticated;

grant select, delete on public.schedule_periods to authenticated;
grant insert (name, kind, start_date, end_date, image_path),
      update (name, kind, start_date, end_date, image_path) on public.schedule_periods to authenticated;

grant select, delete on public.schedules to authenticated;
grant insert (period_id, weekday, date, start_time, end_time, type, title, location, is_cancelled, cancellation_reason)
  on public.schedules to authenticated;
grant update (weekday, date, start_time, end_time, type, title, location, is_cancelled, cancellation_reason)
  on public.schedules to authenticated;

grant select, insert (schedule_id, date, reason), delete on public.schedule_cancellations to authenticated;

alter table public.schedule_periods enable row level security;
alter table public.schedules enable row level security;
alter table public.schedule_cancellations enable row level security;

create policy "Lire les périodes du planning"
  on public.schedule_periods for select to authenticated using (true);
create policy "Créer une période"
  on public.schedule_periods for insert to authenticated
  with check ((select public.has_permission('SCHEDULE_CREATE')));
create policy "Modifier une période"
  on public.schedule_periods for update to authenticated
  using ((select public.has_permission('SCHEDULE_UPDATE')))
  with check ((select public.has_permission('SCHEDULE_UPDATE')));
create policy "Supprimer une période"
  on public.schedule_periods for delete to authenticated
  using ((select public.has_permission('SCHEDULE_DELETE')));

create policy "Lire les créneaux"
  on public.schedules for select to authenticated using (true);
create policy "Ajouter un créneau"
  on public.schedules for insert to authenticated
  with check ((select public.has_permission('SCHEDULE_CREATE')));
create policy "Modifier un créneau"
  on public.schedules for update to authenticated
  using ((select public.has_permission('SCHEDULE_UPDATE')))
  with check ((select public.has_permission('SCHEDULE_UPDATE')));
create policy "Supprimer un créneau"
  on public.schedules for delete to authenticated
  using ((select public.has_permission('SCHEDULE_DELETE')));

-- Annuler un créneau ou le rétablir est une modification du planning.
create policy "Lire les annulations"
  on public.schedule_cancellations for select to authenticated using (true);
create policy "Annuler un créneau"
  on public.schedule_cancellations for insert to authenticated
  with check ((select public.has_permission('SCHEDULE_UPDATE')));
create policy "Rétablir un créneau"
  on public.schedule_cancellations for delete to authenticated
  using ((select public.has_permission('SCHEDULE_UPDATE')));

-- ---------------------------------------------------------------------------
-- P4-08 : images du planning (Supabase Storage)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('planning-images', 'planning-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy "Lister les images du planning (responsables)"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'planning-images'
    and ((select public.has_permission('SCHEDULE_CREATE')) or (select public.has_permission('SCHEDULE_UPDATE')))
  );

create policy "Ajouter une image du planning"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'planning-images'
    and ((select public.has_permission('SCHEDULE_CREATE')) or (select public.has_permission('SCHEDULE_UPDATE')))
  );

create policy "Supprimer une image du planning"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'planning-images'
    and ((select public.has_permission('SCHEDULE_UPDATE')) or (select public.has_permission('SCHEDULE_DELETE')))
  );
