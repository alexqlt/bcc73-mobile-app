-- Fin des créneaux exceptionnels (datés) : le planning n'est fait que de périodes et de créneaux de la
-- semaine. Un programme particulier (vacances, stage d'été…) devient une période « Vacances » : sur
-- ses dates, elle remplace le planning normal, et l'app permet de la consulter à l'avance.
-- Les annulations passent toutes par schedule_cancellations.

delete from public.schedules where weekday is null or period_id is null;

alter table public.schedules drop constraint schedules_recurring_or_dated;
alter table public.schedules
  drop column date,
  drop column is_cancelled,
  drop column cancellation_reason,
  alter column weekday set not null,
  alter column period_id set not null;

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
           c.id is not null, c.reason, c.start_date, c.end_date, a.id, a.name, a.kind
    from active a
    join public.schedules s on s.period_id = a.id and s.weekday = extract(isodow from a.day)
    left join lateral (
      select c.id, c.reason, c.start_date, c.end_date
      from public.schedule_cancellations c
      where c.schedule_id = s.id and a.day between c.start_date and c.end_date
      order by c.created_at desc
      limit 1
    ) as c on true
    order by 2, 3, 4, 6;
end;
$$;
revoke execute on function public.planning(date, date) from public, anon;
grant execute on function public.planning(date, date) to authenticated;

-- Import : créneaux de la semaine et annulations datées uniquement.
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

  insert into public.schedules (period_id, weekday, start_time, end_time, type, title, location)
  select (refs ->> (slot ->> 'period_ref'))::uuid,
         (slot ->> 'weekday')::smallint,
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

  return jsonb_build_object('periods', period_count, 'slots', slot_count, 'cancellations', cancellation_count);
end;
$$;
