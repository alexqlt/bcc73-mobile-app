-- P4-08 (révisé) — Import du planning depuis le fichier .xlsx du club, à la place de l'image.
--
-- - L'image du planning est retirée (colonne et droits). Le bucket planning-images ne peut pas être
--   supprimé en SQL : à supprimer depuis le tableau de bord Supabase (Storage).
-- - Un créneau daté peut désormais appartenir à une période : c'est le programme d'une période de
--   vacances, différent d'une semaine à l'autre. Sans période, il reste un créneau exceptionnel.
-- - import_planning(payload) enregistre tout un import en une seule transaction, avec les droits
--   de l'utilisateur (RLS).

-- ---------------------------------------------------------------------------
-- Retrait de l'image du planning
-- ---------------------------------------------------------------------------

drop policy "Lister les images du planning (responsables)" on storage.objects;
drop policy "Ajouter une image du planning" on storage.objects;
drop policy "Supprimer une image du planning" on storage.objects;

-- Le bucket est vidé et fermé : plus personne ne peut y lire ni y écrire.
update storage.buckets set public = false where id = 'planning-images';

alter table public.schedule_periods drop column image_path;

-- ---------------------------------------------------------------------------
-- Créneaux datés d'une période (programme des vacances)
-- ---------------------------------------------------------------------------

alter table public.schedules drop constraint schedules_check1;
alter table public.schedules add constraint schedules_recurring_or_dated check (
  (period_id is not null and weekday is not null and date is null and not is_cancelled)
  or (weekday is null and date is not null)
);

-- Seul un créneau récurrent s'annule pour une date ; un créneau daté s'annule directement (is_cancelled).
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

comment on table public.schedules is
  'Créneau : récurrent (period_id + weekday), daté d''une période (period_id + date) ou exceptionnel (date seule).';

-- schedule_period_on() renvoie une ligne de schedule_periods : elle est recréée sans image_path.
drop function public.planning(date, date);
drop function public.schedule_period_on(date);

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

-- Un créneau daté d'une période n'est pas « exceptionnel » : il fait partie de son programme.
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
           s.period_id is null, s.is_cancelled, s.cancellation_reason, a.id, a.name, a.kind
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
-- Import en une transaction
-- ---------------------------------------------------------------------------

-- payload :
-- {
--   "periods": [{"ref": "a", "id": "<uuid existant>"}
--               | {"ref": "b", "name": "…", "kind": "normal|holidays", "start_date": "AAAA-MM-JJ", "end_date": "…"}],
--   "slots": [{"period_ref": "a" | null, "weekday": 1-7 | null, "date": "AAAA-MM-JJ" | null,
--              "start_time": "HH:MM", "end_time": "HH:MM", "type": "free_play|training|other",
--              "title": "…", "location": "…" | null}],
--   "cancellations": [{"schedule_id": "<uuid>", "date": "AAAA-MM-JJ" | null, "reason": "…" | null}]
-- }
-- Une annulation avec date vise un créneau récurrent ; sans date, un créneau daté (il est marqué annulé).
create function public.import_planning(payload jsonb)
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

  insert into public.schedule_cancellations (schedule_id, date, reason)
  select (c ->> 'schedule_id')::uuid, (c ->> 'date')::date, nullif(trim(c ->> 'reason'), '')
  from jsonb_array_elements(coalesce(payload -> 'cancellations', '[]')) as c
  where c ->> 'date' is not null
  on conflict (schedule_id, date) do nothing;
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

revoke execute on function public.import_planning(jsonb) from public, anon;
grant execute on function public.import_planning(jsonb) to authenticated;
