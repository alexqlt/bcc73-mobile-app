-- Deux types d'événements : stage (un ou plusieurs jours, tarifs par jour et pour tous les jours) et
-- repas du club (une soirée, tarifs Adulte et Enfant).
--
-- L'inscription devient générale : chaque participant porte son propre tarif (un repas mélange
-- adultes et enfants dans le même paiement). create_event_registrations() remplace
-- create_stage_registrations() (un tarif commun) avec les mêmes contrôles : tarif disponible, pas
-- deux fois le même jour, places suffisantes chaque jour (sous verrou).

create type public.event_kind as enum ('stage', 'meal');

alter table public.stages add column kind public.event_kind not null default 'stage';
comment on column public.stages.kind is 'Type d''événement : stage (jours, tarifs par jour) ou repas du club (soirée, adulte / enfant).';

grant insert (kind), update (kind) on public.stages to authenticated;

-- Jours couverts par un tarif : son jour, ou tous les jours de l'événement.
create function public.price_days(stage uuid, price uuid)
returns date[]
language sql
stable
set search_path = ''
as $$
  select case
    when p.day is null then array(select public.stage_days(stage))
    else array[p.day]
  end
  from public.stage_prices p
  where p.id = price and p.stage_id = stage;
$$;

revoke execute on function public.price_days(uuid, uuid) from public, anon;
grant execute on function public.price_days(uuid, uuid) to authenticated;

-- entries : [{"member_id": "…", "price_id": "…"}, …] — un tarif par participant.
create function public.create_event_registrations(stage uuid, entries jsonb)
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

  -- Participants : membres distincts de ce compte, licence validée.
  if (
    select count(distinct m.id)
    from jsonb_to_recordset(entries) as e (member_id uuid, price_id uuid)
    join public.members m on m.id = e.member_id and m.account_id = auth.uid() and m.status = 'approved'
  ) <> people or distinct_people <> people then
    raise exception 'Choisissez des membres de votre compte dont la licence est validée, une seule fois chacun.'
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

-- Mode développeur : même parcours, confirmé sans paiement (administrateurs).
create function public.admin_test_event_registration(stage uuid, entries jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_order uuid;
begin
  if not public.is_admin() then
    raise exception 'Le mode développeur est réservé aux administrateurs.' using errcode = '42501';
  end if;
  new_order := public.create_event_registrations(stage, entries);
  update public.orders set provider = 'test' where id = new_order;
  perform public.confirm_order_payment(new_order, 'TEST');
  return new_order;
end;
$$;

revoke execute on function public.create_event_registrations(uuid, jsonb) from public, anon;
revoke execute on function public.admin_test_event_registration(uuid, jsonb) from public, anon;
grant execute on function public.create_event_registrations(uuid, jsonb) to authenticated;
grant execute on function public.admin_test_event_registration(uuid, jsonb) to authenticated;

-- Remplacées par les versions « un tarif par participant ».
drop function public.admin_test_stage_registration(uuid, uuid[], uuid);
drop function public.create_stage_registrations(uuid, uuid[], uuid);
