-- Stages : plusieurs jours uniques par participant (un tarif par jour choisi), sans recouvrement
-- (tous les jours + un jour, ou deux fois le même jour, sont refusés).

create or replace function public.create_event_registrations(stage uuid, entries jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_order uuid;
  target record;
  today date := (now() at time zone 'Europe/Paris')::date;
  people integer;
  distinct_people integer;
  problem text;
  full_day date;
  holder text;
begin
  perform public.require_approved_account();

  -- Le verrou sur l'événement empêche deux inscriptions simultanées de dépasser la capacité.
  select id, title, is_published into target from public.stages where id = stage for update;
  if not found or not target.is_published then
    raise exception 'Cet événement n''est pas disponible.' using errcode = 'P0001';
  end if;

  select count(*), count(distinct e.member_id)
  into people, distinct_people
  from jsonb_to_recordset(entries) as e (member_id uuid, price_id uuid);
  if people = 0 then
    raise exception 'Choisissez au moins un participant.' using errcode = 'P0001';
  end if;

  -- Participants : membres de ce compte, licence validée. Un membre peut prendre plusieurs tarifs
  -- (plusieurs jours uniques), jamais deux fois le même.
  if (
    select count(*)
    from jsonb_to_recordset(entries) as e (member_id uuid, price_id uuid)
    join public.members m on m.id = e.member_id and m.account_id = auth.uid() and m.status = 'approved'
  ) <> people
  or (
    select count(distinct (e.member_id, e.price_id)) from jsonb_to_recordset(entries) as e (member_id uuid, price_id uuid)
  ) <> people then
    raise exception 'Choisissez des membres de votre compte dont la licence est validée, chaque tarif une seule fois.'
      using errcode = 'P0001';
  end if;

  -- Tarifs : de cet événement, aux jours encore à venir.
  if exists (
    select 1
    from jsonb_to_recordset(entries) as e (member_id uuid, price_id uuid)
    left join public.stage_prices p on p.id = e.price_id and p.stage_id = stage
    where p.id is null
  ) then
    raise exception 'Choisissez un tarif de cet événement pour chaque participant.' using errcode = 'P0001';
  end if;
  select p.name into problem
  from jsonb_to_recordset(entries) as e (member_id uuid, price_id uuid)
  join public.stage_prices p on p.id = e.price_id
  where cardinality(public.price_days(stage, p.id)) = 0
     or not public.price_days(stage, p.id) <@ array(select public.stage_days(stage))
     or (public.price_days(stage, p.id))[1] < today
  limit 1;
  if problem is not null then
    raise exception 'Le tarif « % » n''est plus disponible.', problem using errcode = 'P0001';
  end if;

  -- Un participant ne prend pas deux tarifs qui couvrent le même jour (ex. tous les jours + un jour).
  if exists (
    select 1
    from rows from (jsonb_to_recordset(entries) as (member_id uuid, price_id uuid)) with ordinality as a (member_id, price_id, n)
    join rows from (jsonb_to_recordset(entries) as (member_id uuid, price_id uuid)) with ordinality as b (member_id, price_id, n)
      on a.member_id = b.member_id and a.n < b.n
    where public.price_days(stage, a.price_id) && public.price_days(stage, b.price_id)
  ) then
    raise exception 'Un participant ne peut pas prendre deux tarifs pour le même jour.' using errcode = 'P0001';
  end if;

  perform public.expire_pending_orders();

  -- Personne n'est inscrit deux fois le même jour.
  select string_agg(distinct r.member_name, ', ') into problem
  from jsonb_to_recordset(entries) as e (member_id uuid, price_id uuid)
  join public.stage_registrations r
    on r.stage_id = stage and r.member_id = e.member_id and r.status <> 'cancelled'
   and r.days && public.price_days(stage, e.price_id);
  if problem is not null then
    raise exception 'Déjà inscrit(e) (ou paiement en cours) : %.', problem using errcode = 'P0001';
  end if;

  -- Assez de places chaque jour pour les participants de ce jour-là.
  select d.day into full_day
  from public.stage_day_places(stage) as d
  where d.places_left < (
    select count(*)
    from jsonb_to_recordset(entries) as e (member_id uuid, price_id uuid)
    where d.day = any (public.price_days(stage, e.price_id))
  )
  order by d.day
  limit 1;
  if full_day is not null then
    raise exception 'Plus assez de places le % pour tous les participants.', to_char(full_day, 'DD/MM') using errcode = 'P0001';
  end if;

  select m.first_name || ' ' || m.last_name into holder
  from jsonb_to_recordset(entries) as e (member_id uuid, price_id uuid)
  join public.members m on m.id = e.member_id
  order by m.is_account_holder desc, m.created_at
  limit 1;

  insert into public.orders (account_id, type, total_cents, payer_name, payer_email)
  select auth.uid(), 'stage', sum(p.amount_cents), holder, (select email from auth.users where id = auth.uid())
  from jsonb_to_recordset(entries) as e (member_id uuid, price_id uuid)
  join public.stage_prices p on p.id = e.price_id
  returning id into new_order;

  insert into public.order_items (order_id, label, quantity, unit_price_cents)
  select new_order,
         target.title || ' – ' || m.first_name || ' ' || m.last_name || ' (' || p.name || ')',
         1,
         p.amount_cents
  from jsonb_to_recordset(entries) as e (member_id uuid, price_id uuid)
  join public.members m on m.id = e.member_id
  join public.stage_prices p on p.id = e.price_id
  order by m.is_account_holder desc, m.created_at;

  insert into public.stage_registrations
    (stage_id, member_id, stage_price_id, order_id, price_name, amount_cents, member_name, member_license, days)
  select stage, m.id, p.id, new_order, p.name, p.amount_cents,
         m.first_name || ' ' || m.last_name, m.license_number, public.price_days(stage, p.id)
  from jsonb_to_recordset(entries) as e (member_id uuid, price_id uuid)
  join public.members m on m.id = e.member_id
  join public.stage_prices p on p.id = e.price_id;

  return new_order;
end;
$$;
