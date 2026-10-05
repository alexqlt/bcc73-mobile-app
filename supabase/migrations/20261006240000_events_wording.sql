-- Vocabulaire : « stage » devient « événement » dans tout ce que voient les utilisateurs (plus
-- général : stages, tournois internes, soirées…). Les noms techniques (tables stages, fonctions,
-- permissions STAGE_*) ne changent pas.

update public.permissions set description = case code
  when 'STAGE_READ' then 'Consulter les événements'
  when 'STAGE_CREATE' then 'Créer un événement'
  when 'STAGE_UPDATE' then 'Modifier un événement'
  when 'STAGE_DELETE' then 'Supprimer un événement'
  when 'STAGE_VIEW_REGISTRATIONS' then 'Voir les inscrits aux événements'
  else description
end
where code like 'STAGE\_%';

update public.roles
set name = 'Responsable événements', description = 'Organisation des événements et suivi des inscriptions.'
where name = 'Responsable stages';

-- Messages d'erreur de l'inscription (même fonction, textes seuls modifiés).
create or replace function public.create_stage_registrations(stage uuid, member_ids uuid[], price uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_order uuid;
  target record;
  chosen record;
  covered date[];
  today date := (now() at time zone 'Europe/Paris')::date;
  people integer;
  full_day date;
  taken text;
  holder text;
begin
  perform public.require_approved_account();

  -- Le verrou sur le stage empêche deux inscriptions simultanées de dépasser la capacité.
  select id, title, is_published into target from public.stages where id = stage for update;
  if not found or not target.is_published then
    raise exception 'Cet événement n''est pas disponible.' using errcode = 'P0001';
  end if;

  select id, name, amount_cents, day into chosen from public.stage_prices where id = price and stage_id = stage;
  if not found then
    raise exception 'Choisissez un tarif de cet événement.' using errcode = 'P0001';
  end if;
  covered := case
    when chosen.day is null then array(select public.stage_days(stage))
    else array[chosen.day]
  end;
  if cardinality(covered) = 0 or not covered <@ array(select public.stage_days(stage)) then
    raise exception 'Ce tarif ne correspond plus aux dates de l''événement.' using errcode = 'P0001';
  end if;
  if covered[1] < today then
    raise exception 'Ce tarif n''est plus disponible : % est passé.',
      case when chosen.day is null then 'l''événement a commencé, il' else 'ce jour' end
      using errcode = 'P0001';
  end if;

  -- Les membres choisis : de ce compte, licence validée, sans doublon.
  select count(*) into people
  from public.members
  where id = any (member_ids) and account_id = auth.uid() and status = 'approved';
  if people = 0 or people <> cardinality(array(select distinct unnest(member_ids))) then
    raise exception 'Choisissez des membres de votre compte dont la licence est validée.' using errcode = 'P0001';
  end if;

  perform public.expire_pending_orders();

  -- Personne n'est inscrit deux fois le même jour.
  select string_agg(distinct r.member_name, ', ') into taken
  from public.stage_registrations r
  where r.stage_id = stage and r.member_id = any (member_ids) and r.status <> 'cancelled' and r.days && covered;
  if taken is not null then
    raise exception 'Déjà inscrit(e) à l''un de ces jours (ou paiement en cours) : %.', taken using errcode = 'P0001';
  end if;

  -- Assez de places chaque jour pour toutes les personnes choisies.
  select p.day into full_day
  from public.stage_day_places(stage) as p
  where p.day = any (covered) and p.places_left < people
  order by p.day
  limit 1;
  if full_day is not null then
    raise exception 'Plus assez de places le % pour % personne(s).', to_char(full_day, 'DD/MM'), people
      using errcode = 'P0001';
  end if;

  select m.first_name || ' ' || m.last_name into holder
  from public.members m
  where m.id = any (member_ids)
  order by m.is_account_holder desc, m.created_at
  limit 1;

  insert into public.orders (account_id, type, total_cents, payer_name, payer_email)
  values (
    auth.uid(), 'stage', chosen.amount_cents * people, holder,
    (select email from auth.users where id = auth.uid())
  )
  returning id into new_order;

  insert into public.order_items (order_id, label, quantity, unit_price_cents)
  select new_order,
         target.title || ' – ' || m.first_name || ' ' || m.last_name || ' (' || chosen.name || ')',
         1,
         chosen.amount_cents
  from public.members m
  where m.id = any (member_ids)
  order by m.is_account_holder desc, m.created_at;

  insert into public.stage_registrations
    (stage_id, member_id, stage_price_id, order_id, price_name, amount_cents, member_name, member_license, days)
  select stage, m.id, price, new_order, chosen.name, chosen.amount_cents,
         m.first_name || ' ' || m.last_name, m.license_number, covered
  from public.members m
  where m.id = any (member_ids);

  return new_order;
end;
$$;

