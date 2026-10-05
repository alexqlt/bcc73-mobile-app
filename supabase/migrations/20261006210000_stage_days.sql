-- Stages sur plusieurs jours : tarifs par jour ou pour tous les jours, places comptées par jour,
-- inscription de plusieurs membres du compte en un seul paiement.
--
-- - stage_prices.day : jour couvert par le tarif ; vide = tous les jours du stage.
-- - stage_registrations.days : jours couverts par l'inscription (copie à l'inscription).
-- - La capacité du stage s'entend par jour : stage_day_places() donne les places restantes de
--   chaque jour (inscriptions confirmées ou en cours de paiement).
-- - Un tarif n'est plus proposé si l'un de ses jours est passé ou complet ; un membre ne peut pas
--   être inscrit deux fois le même jour.

-- ---------------------------------------------------------------------------
-- Colonnes
-- ---------------------------------------------------------------------------

alter table public.stage_prices add column day date;
comment on column public.stage_prices.day is 'Jour couvert par le tarif ; vide = tous les jours du stage.';

alter table public.stage_registrations add column days date[];
comment on column public.stage_registrations.days is 'Jours couverts par l''inscription (copie au moment de l''inscription).';

grant insert (day), update (day) on public.stage_prices to authenticated;

-- Une même personne peut s'inscrire à plusieurs jours séparément : l'unicité devient « pas deux fois
-- le même jour », vérifiée à l'inscription.
drop index public.stage_registrations_one_per_member;

-- ---------------------------------------------------------------------------
-- Jours et places
-- ---------------------------------------------------------------------------

-- Jours du stage (heure de Paris), du premier au dernier.
create function public.stage_days(stage uuid)
returns setof date
language sql
stable
set search_path = ''
as $$
  select d::date
  from public.stages s,
       generate_series((s.start_at at time zone 'Europe/Paris')::date,
                       (s.end_at at time zone 'Europe/Paris')::date,
                       interval '1 day') as d
  where s.id = stage
  order by 1;
$$;

-- Inscriptions existantes : elles couvraient tout le stage.
update public.stage_registrations r
set days = array(select public.stage_days(r.stage_id))
where days is null;

alter table public.stage_registrations alter column days set not null;

-- Places restantes de chaque jour du stage.
create function public.stage_day_places(stage uuid)
returns table (day date, places_left integer)
language sql
stable
security definer
set search_path = ''
as $$
  select d.day,
         s.capacity - (
           select count(*)::integer
           from public.stage_registrations r
           where r.stage_id = s.id
             and d.day = any (r.days)
             and (r.status = 'confirmed'
                  or (r.status = 'pending' and r.created_at >= now() - public.order_hold_interval()))
         )
  from public.stages s
  cross join lateral public.stage_days(s.id) as d (day)
  where s.id = stage
  order by d.day;
$$;

-- Places restantes du jour le plus rempli (aperçu des listes).
create or replace function public.stage_places_left(stage uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(min(places_left), 0) from public.stage_day_places(stage);
$$;

revoke execute on function public.stage_days(uuid) from public, anon;
revoke execute on function public.stage_day_places(uuid) from public, anon;
grant execute on function public.stage_days(uuid) to authenticated;
grant execute on function public.stage_day_places(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Inscription de plusieurs membres en un seul paiement
-- ---------------------------------------------------------------------------

drop function public.create_stage_registration(uuid, uuid, uuid);

create function public.create_stage_registrations(stage uuid, member_ids uuid[], price uuid)
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
    raise exception 'Ce stage n''est pas disponible.' using errcode = 'P0001';
  end if;

  select id, name, amount_cents, day into chosen from public.stage_prices where id = price and stage_id = stage;
  if not found then
    raise exception 'Choisissez un tarif de ce stage.' using errcode = 'P0001';
  end if;
  covered := case
    when chosen.day is null then array(select public.stage_days(stage))
    else array[chosen.day]
  end;
  if cardinality(covered) = 0 or not covered <@ array(select public.stage_days(stage)) then
    raise exception 'Ce tarif ne correspond plus aux dates du stage.' using errcode = 'P0001';
  end if;
  if covered[1] < today then
    raise exception 'Ce tarif n''est plus disponible : % est passé.',
      case when chosen.day is null then 'le stage a commencé, il' else 'ce jour' end
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

revoke execute on function public.create_stage_registrations(uuid, uuid[], uuid) from public, anon;
grant execute on function public.create_stage_registrations(uuid, uuid[], uuid) to authenticated;
