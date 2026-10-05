-- P6-15 — Nom et licence de l'inscrit enregistrés avec l'inscription.
--
-- Le responsable des stages (STAGE_VIEW_REGISTRATIONS) doit voir qui est inscrit sans avoir accès
-- à la liste des adhérents (MEMBER_VIEW) : l'inscription garde le nom et la licence du membre.

alter table public.stage_registrations add column member_name text;
alter table public.stage_registrations add column member_license text;

update public.stage_registrations r
set member_name = m.first_name || ' ' || m.last_name, member_license = m.license_number
from public.members m
where m.id = r.member_id;

alter table public.stage_registrations alter column member_name set not null;

-- P6-12 : inscription d'un membre du compte à un stage, avec le tarif choisi.
create or replace function public.create_stage_registration(stage uuid, member uuid, price uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_order uuid;
  target record;
  chosen record;
  person record;
begin
  perform public.require_approved_account();

  select id, title, start_at, is_published into target from public.stages where id = stage for update;
  if not found or not target.is_published then
    raise exception 'Ce stage n''est pas disponible.' using errcode = 'P0001';
  end if;
  if target.start_at <= now() then
    raise exception 'Les inscriptions à ce stage sont closes.' using errcode = 'P0001';
  end if;

  select id, first_name, last_name, license_number into person
  from public.members
  where id = member and account_id = auth.uid() and status = 'approved';
  if not found then
    raise exception 'Seul un membre de votre compte dont la licence est validée peut être inscrit.' using errcode = 'P0001';
  end if;

  select id, name, amount_cents into chosen from public.stage_prices where id = price and stage_id = stage;
  if not found then
    raise exception 'Choisissez un tarif de ce stage.' using errcode = 'P0001';
  end if;

  -- Le verrou sur le stage (for update ci-dessus) empêche deux inscriptions de prendre la dernière place.
  perform public.expire_pending_orders();
  if exists (
    select 1 from public.stage_registrations
    where stage_id = stage and member_id = member and status <> 'cancelled'
  ) then
    raise exception '% est déjà inscrit(e) à ce stage (ou un paiement est en cours).', person.first_name
      using errcode = 'P0001';
  end if;
  if public.stage_places_left(stage) <= 0 then
    raise exception 'Ce stage est complet.' using errcode = 'P0001';
  end if;

  insert into public.orders (account_id, type, total_cents, payer_name, payer_email)
  values (
    auth.uid(), 'stage', chosen.amount_cents,
    person.first_name || ' ' || person.last_name,
    (select email from auth.users where id = auth.uid())
  )
  returning id into new_order;

  insert into public.order_items (order_id, label, quantity, unit_price_cents)
  values (
    new_order,
    target.title || ' – ' || person.first_name || ' ' || person.last_name || ' (' || chosen.name || ')',
    1,
    chosen.amount_cents
  );

  insert into public.stage_registrations
    (stage_id, member_id, stage_price_id, order_id, price_name, amount_cents, member_name, member_license)
  values (
    stage, member, price, new_order, chosen.name, chosen.amount_cents,
    person.first_name || ' ' || person.last_name, person.license_number
  );

  return new_order;
end;
$$;

