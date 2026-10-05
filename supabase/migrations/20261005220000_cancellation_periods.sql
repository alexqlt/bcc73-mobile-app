-- P4-07 (révisé) — Une annulation couvre une période (du … au …) et non plus une seule date.
--
-- Un créneau récurrent annulé du 12 au 25 octobre n'a pas lieu ces jours-là ; l'app l'affiche à sa
-- place habituelle, barré, avec la période et le motif.

alter table public.schedule_cancellations add column start_date date;
alter table public.schedule_cancellations add column end_date date;
update public.schedule_cancellations set start_date = date, end_date = date;
alter table public.schedule_cancellations alter column start_date set not null;
alter table public.schedule_cancellations alter column end_date set not null;
alter table public.schedule_cancellations add constraint schedule_cancellations_dates_check check (end_date >= start_date);

-- Supprime aussi l'index et la contrainte d'unicité (schedule_id, date).
alter table public.schedule_cancellations drop column date;
create index schedule_cancellations_schedule_dates_idx on public.schedule_cancellations (schedule_id, end_date);

comment on table public.schedule_cancellations is
  'Créneau récurrent annulé pendant une période (gymnase indisponible, compétition…).';

revoke insert on public.schedule_cancellations from authenticated;
grant insert (schedule_id, start_date, end_date, reason) on public.schedule_cancellations to authenticated;

-- L'annulation doit viser un créneau récurrent qui a lieu au moins un jour de la période choisie.
create or replace function public.check_schedule_cancellation()
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
  where s.id = new.schedule_id
    and s.weekday is not null;

  if not found then
    raise exception 'Seul un créneau récurrent peut être annulé pour une période.' using errcode = 'P0001';
  end if;
  if not exists (
    select 1
    from generate_series(
      greatest(new.start_date, slot.start_date),
      least(new.end_date, slot.end_date),
      interval '1 day'
    ) as d
    where extract(isodow from d) = slot.weekday
  ) then
    raise exception 'Ce créneau n''a lieu aucun jour de cette période.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- planning() : annulation par période, dont les dates sont renvoyées pour l'affichage.
drop function public.planning(date, date);

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
  cancellation_start date,
  cancellation_end date,
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
           false, c.id is not null, c.reason, c.start_date, c.end_date, a.id, a.name, a.kind
    from active a
    join public.schedules s on s.period_id = a.id and s.weekday = extract(isodow from a.day)
    left join lateral (
      select c.id, c.reason, c.start_date, c.end_date
      from public.schedule_cancellations c
      where c.schedule_id = s.id and a.day between c.start_date and c.end_date
      order by c.created_at desc
      limit 1
    ) as c on true
    union all
    select s.id, s.date, s.start_time, s.end_time, s.type, s.title, s.location,
           s.period_id is null, s.is_cancelled, s.cancellation_reason, null, null, a.id, a.name, a.kind
    from public.schedules s
    left join active a on a.day = s.date
    where s.date between from_date and to_date
    order by 2, 3, 4, 6;
end;
$$;

revoke execute on function public.planning(date, date) from public, anon;
grant execute on function public.planning(date, date) to authenticated;

-- import_planning() : une ligne d'annulation datée du fichier annule ce seul jour.
create or replace function public.import_planning(payload jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  refs jsonb := '{}';
  period jsonb;
  new_id uuid;
  period_count int := 0;
  slot_count int := 0;
  cancellation_count int := 0;
  updated_count int := 0;
begin
  for period in select * from jsonb_array_elements(coalesce(payload -> 'periods', '[]')) loop
    if period ? 'id' then
      refs := refs || jsonb_build_object(period ->> 'ref', period ->> 'id');
    else
      insert into public.schedule_periods (name, kind, start_date, end_date)
      values (
        period ->> 'name',
        (period ->> 'kind')::public.schedule_period_kind,
        (period ->> 'start_date')::date,
        (period ->> 'end_date')::date
      )
      returning id into new_id;
      refs := refs || jsonb_build_object(period ->> 'ref', new_id);
      period_count := period_count + 1;
    end if;
  end loop;

  insert into public.schedules (period_id, weekday, date, start_time, end_time, type, title, location)
  select (refs ->> (slot ->> 'period_ref'))::uuid,
         (slot ->> 'weekday')::smallint,
         (slot ->> 'date')::date,
         (slot ->> 'start_time')::time,
         (slot ->> 'end_time')::time,
         (slot ->> 'type')::public.schedule_type,
         slot ->> 'title',
         nullif(trim(slot ->> 'location'), '')
  from jsonb_array_elements(coalesce(payload -> 'slots', '[]')) as slot;
  get diagnostics slot_count = row_count;

  -- Une annulation identique déjà enregistrée n'est pas recréée.
  insert into public.schedule_cancellations (schedule_id, start_date, end_date, reason)
  select (c ->> 'schedule_id')::uuid, (c ->> 'date')::date, (c ->> 'date')::date, nullif(trim(c ->> 'reason'), '')
  from jsonb_array_elements(coalesce(payload -> 'cancellations', '[]')) as c
  where c ->> 'date' is not null
    and not exists (
      select 1 from public.schedule_cancellations existing
      where existing.schedule_id = (c ->> 'schedule_id')::uuid
        and (c ->> 'date')::date between existing.start_date and existing.end_date
    );
  get diagnostics cancellation_count = row_count;

  update public.schedules s
  set is_cancelled = true, cancellation_reason = nullif(trim(c ->> 'reason'), '')
  from jsonb_array_elements(coalesce(payload -> 'cancellations', '[]')) as c
  where c ->> 'date' is null
    and s.id = (c ->> 'schedule_id')::uuid
    and s.date is not null;
  get diagnostics updated_count = row_count;

  return jsonb_build_object(
    'periods', period_count,
    'slots', slot_count,
    'cancellations', cancellation_count + updated_count
  );
end;
$$;
