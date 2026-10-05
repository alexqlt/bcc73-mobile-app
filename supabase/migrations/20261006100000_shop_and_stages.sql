-- Phase 6 — Boutique de volants, stages et paiements HelloAsso (APP.md §10 à §12, §19 et §20).
--
-- P6-02 commandes, P6-05 produits, P6-09 stages, P6-13 capacité.
--
-- Principes :
-- - les montants sont toujours calculés ici, à partir des prix enregistrés : l'app ne fait que
--   demander « 2 tubes » ou « inscrire Lucas au stage avec le tarif Jeune » ;
-- - une commande reste `pending` jusqu'à la confirmation du paiement par HelloAsso, vérifiée par
--   l'Edge Function (jamais sur la seule foi du retour `success`) via confirm_order_payment() ;
-- - une inscription en attente de paiement bloque sa place 45 minutes (délai d'abandon d'un
--   paiement HelloAsso), puis est annulée si rien n'est payé.
-- Montants en centimes, comme dans l'API HelloAsso.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.order_type as enum ('shop', 'stage');
create type public.order_status as enum (
  'pending',   -- commande créée, paiement en cours
  'paid',      -- paiement confirmé par HelloAsso
  'cancelled'  -- abandonnée (délai dépassé) ou annulée avant paiement
);
create type public.registration_status as enum ('pending', 'confirmed', 'cancelled');

-- ---------------------------------------------------------------------------
-- Boutique (P6-05)
-- ---------------------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  description text check (char_length(description) <= 1000),
  price_cents integer not null check (price_cents > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.products is 'Article de la boutique (tubes de volants…). Pas de gestion de stock en V1.';

-- ---------------------------------------------------------------------------
-- Stages (P6-09)
-- ---------------------------------------------------------------------------

create table public.stages (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 150),
  description text check (char_length(description) <= 5000),
  location text check (char_length(location) <= 150),
  start_at timestamptz not null,
  end_at timestamptz not null,
  capacity integer not null check (capacity > 0),
  -- Brouillon tant qu'il n'est pas publié : invisible dans l'app.
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at)
);

create table public.stage_prices (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  amount_cents integer not null check (amount_cents > 0),
  position smallint not null default 0
);

create index stage_prices_stage_id_idx on public.stage_prices (stage_id, position);
create index stages_start_at_idx on public.stages (start_at);

-- ---------------------------------------------------------------------------
-- Commandes et inscriptions (P6-02)
-- ---------------------------------------------------------------------------

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  -- Conservée même si le compte est supprimé (historique des paiements du club).
  account_id uuid references public.accounts (id) on delete set null,
  type public.order_type not null,
  status public.order_status not null default 'pending',
  total_cents integer not null check (total_cents > 0),
  -- Payeur au moment de la commande (affichage dans le back-office).
  payer_name text,
  payer_email text,
  -- Prestataire de paiement : permet d'en changer sans réécrire l'application (APP.md §20).
  provider text not null default 'helloasso',
  provider_checkout_id text unique,
  provider_order_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  cancelled_at timestamptz,
  -- Boutique : date de remise des articles au club.
  picked_up_at timestamptz
);

create index orders_account_id_idx on public.orders (account_id, created_at desc);
create index orders_status_created_idx on public.orders (status, created_at);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  label text not null,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents > 0)
);

create index order_items_order_id_idx on public.order_items (order_id);

create table public.stage_registrations (
  id uuid primary key default gen_random_uuid(),
  -- Un stage avec des inscriptions ne peut pas être supprimé (historique des paiements).
  stage_id uuid not null references public.stages (id) on delete restrict,
  member_id uuid not null references public.members (id) on delete cascade,
  stage_price_id uuid references public.stage_prices (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  status public.registration_status not null default 'pending',
  -- Tarif au moment de l'inscription.
  price_name text not null,
  amount_cents integer not null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz
);

-- Un membre n'est inscrit qu'une fois à un stage (hors inscriptions annulées).
create unique index stage_registrations_one_per_member
  on public.stage_registrations (stage_id, member_id)
  where status <> 'cancelled';
create index stage_registrations_order_id_idx on public.stage_registrations (order_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger stages_set_updated_at before update on public.stages
  for each row execute function public.set_updated_at();

create trigger products_audit after insert or update or delete on public.products
  for each row execute function public.audit_change();
create trigger stages_audit after insert or update or delete on public.stages
  for each row execute function public.audit_change();
create trigger stage_prices_audit after insert or update or delete on public.stage_prices
  for each row execute function public.audit_change();

-- ---------------------------------------------------------------------------
-- P6-13 : places et commandes abandonnées
-- ---------------------------------------------------------------------------

-- Délai après lequel un paiement non confirmé est considéré comme abandonné (HelloAsso : 45 min).
create function public.order_hold_interval()
returns interval
language sql
immutable
as $$ select interval '45 minutes' $$;

-- Annule les commandes en attente depuis trop longtemps et libère leurs places.
create function public.expire_pending_orders()
returns void
language sql
security definer
set search_path = ''
as $$
  with expired as (
    update public.orders
    set status = 'cancelled', cancelled_at = now()
    where status = 'pending' and created_at < now() - public.order_hold_interval()
    returning id
  )
  update public.stage_registrations r
  set status = 'cancelled', cancelled_at = now()
  from expired
  where r.order_id = expired.id and r.status = 'pending';
$$;

-- Places restantes : capacité moins les inscriptions confirmées ou en cours de paiement.
create function public.stage_places_left(stage uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select s.capacity - (
    select count(*)::integer
    from public.stage_registrations r
    where r.stage_id = s.id
      and (r.status = 'confirmed'
           or (r.status = 'pending' and r.created_at >= now() - public.order_hold_interval()))
  )
  from public.stages s
  where s.id = stage;
$$;

-- ---------------------------------------------------------------------------
-- Création des commandes (appelées par l'Edge Function avec la session de l'utilisateur)
-- ---------------------------------------------------------------------------

-- Le compte doit avoir au moins une licence validée pour acheter ou s'inscrire.
create function public.require_approved_account()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.members where account_id = auth.uid() and status = 'approved'
  ) then
    raise exception 'Les achats et inscriptions sont ouverts une fois une licence du compte validée par le club.'
      using errcode = 'P0001';
  end if;
end;
$$;

-- P6-06 : commande de la boutique. items : [{"product_id": "…", "quantity": 2}, …]
create function public.create_shop_order(items jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_order uuid;
  total integer;
  holder record;
  create_items jsonb;
begin
  perform public.require_approved_account();
  perform public.expire_pending_orders();

  -- Articles demandés, regroupés par produit.
  create_items := (
    select coalesce(jsonb_agg(jsonb_build_object('product_id', product_id, 'quantity', quantity)), '[]')
    from (
      select w.product_id, sum(w.quantity)::integer as quantity
      from jsonb_to_recordset(items) as w (product_id uuid, quantity integer)
      group by w.product_id
    ) as grouped
  );

  if jsonb_array_length(create_items) = 0 or exists (
    select 1 from jsonb_to_recordset(create_items) as w (product_id uuid, quantity integer)
    where w.quantity is null or w.quantity not between 1 and 50
  ) then
    raise exception 'Choisissez entre 1 et 50 articles.' using errcode = 'P0001';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(create_items) as w (product_id uuid, quantity integer)
    left join public.products p on p.id = w.product_id and p.active
    where p.id is null
  ) then
    raise exception 'Un article n''est plus disponible. Actualisez la boutique.' using errcode = 'P0001';
  end if;

  select sum(w.quantity * p.price_cents) into total
  from jsonb_to_recordset(create_items) as w (product_id uuid, quantity integer)
  join public.products p on p.id = w.product_id;

  select m.first_name, m.last_name into holder
  from public.members m
  where m.account_id = auth.uid() and m.status = 'approved'
  order by m.is_account_holder desc, m.created_at
  limit 1;

  insert into public.orders (account_id, type, total_cents, payer_name, payer_email)
  values (
    auth.uid(), 'shop', total,
    holder.first_name || ' ' || holder.last_name,
    (select email from auth.users where id = auth.uid())
  )
  returning id into new_order;

  insert into public.order_items (order_id, product_id, label, quantity, unit_price_cents)
  select new_order, p.id, p.name, w.quantity, p.price_cents
  from jsonb_to_recordset(create_items) as w (product_id uuid, quantity integer)
  join public.products p on p.id = w.product_id;

  return new_order;
end;
$$;

-- P6-12 : inscription d'un membre du compte à un stage, avec le tarif choisi.
create function public.create_stage_registration(stage uuid, member uuid, price uuid)
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

  select id, first_name, last_name into person
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

  insert into public.stage_registrations (stage_id, member_id, stage_price_id, order_id, price_name, amount_cents)
  values (stage, member, price, new_order, chosen.name, chosen.amount_cents);

  return new_order;
end;
$$;

-- Paiement confirmé par HelloAsso (appelée uniquement par l'Edge Function, après vérification
-- auprès de l'API HelloAsso). Idempotente : un webhook rejoué ne change rien.
create function public.confirm_order_payment(order_id uuid, provider_order text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.orders
  set status = 'paid', paid_at = coalesce(paid_at, now()), cancelled_at = null,
      provider_order_id = coalesce(provider_order, provider_order_id)
  where id = order_id and status <> 'paid';

  -- Même payée après le délai, l'inscription est confirmée : le club a reçu l'argent.
  update public.stage_registrations
  set status = 'confirmed', confirmed_at = coalesce(confirmed_at, now()), cancelled_at = null
  where stage_registrations.order_id = confirm_order_payment.order_id and status <> 'confirmed';
end;
$$;

-- Paiement abandonné (retour « modifier le panier » ou erreur), vérifié par l'Edge Function.
create function public.cancel_pending_order(order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.orders set status = 'cancelled', cancelled_at = now()
  where id = order_id and status = 'pending';
  update public.stage_registrations set status = 'cancelled', cancelled_at = now()
  where stage_registrations.order_id = cancel_pending_order.order_id and status = 'pending';
end;
$$;

revoke execute on function public.expire_pending_orders() from public, anon, authenticated;
revoke execute on function public.stage_places_left(uuid) from public, anon;
revoke execute on function public.require_approved_account() from public, anon, authenticated;
revoke execute on function public.create_shop_order(jsonb) from public, anon;
revoke execute on function public.create_stage_registration(uuid, uuid, uuid) from public, anon;
revoke execute on function public.confirm_order_payment(uuid, text) from public, anon, authenticated;
revoke execute on function public.cancel_pending_order(uuid) from public, anon, authenticated;
grant execute on function public.stage_places_left(uuid) to authenticated;
grant execute on function public.create_shop_order(jsonb) to authenticated;
grant execute on function public.create_stage_registration(uuid, uuid, uuid) to authenticated;
grant execute on function public.confirm_order_payment(uuid, text) to service_role;
grant execute on function public.cancel_pending_order(uuid) to service_role;
grant execute on function public.expire_pending_orders() to service_role;

-- ---------------------------------------------------------------------------
-- Droits et RLS
-- ---------------------------------------------------------------------------

revoke all on public.products, public.stages, public.stage_prices, public.orders, public.order_items,
  public.stage_registrations from anon, authenticated;

grant select, delete on public.products to authenticated;
grant insert (name, description, price_cents, active), update (name, description, price_cents, active)
  on public.products to authenticated;

grant select, delete on public.stages to authenticated;
grant insert (title, description, location, start_at, end_at, capacity, is_published),
      update (title, description, location, start_at, end_at, capacity, is_published)
  on public.stages to authenticated;

grant select, delete on public.stage_prices to authenticated;
grant insert (stage_id, name, amount_cents, position), update (name, amount_cents, position)
  on public.stage_prices to authenticated;

-- Commandes et inscriptions : créées par les fonctions ci-dessus, jamais directement.
grant select on public.orders, public.order_items, public.stage_registrations to authenticated;
grant update (picked_up_at) on public.orders to authenticated;

alter table public.products enable row level security;
alter table public.stages enable row level security;
alter table public.stage_prices enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.stage_registrations enable row level security;

create policy "Lire les produits"
  on public.products for select to authenticated
  using (active or (select public.has_permission('VOLANT_MANAGE')));
create policy "Créer un produit"
  on public.products for insert to authenticated
  with check ((select public.has_permission('VOLANT_MANAGE')));
create policy "Modifier un produit"
  on public.products for update to authenticated
  using ((select public.has_permission('VOLANT_MANAGE')))
  with check ((select public.has_permission('VOLANT_MANAGE')));
create policy "Supprimer un produit"
  on public.products for delete to authenticated
  using ((select public.has_permission('VOLANT_MANAGE')));

create policy "Lire les stages publiés"
  on public.stages for select to authenticated
  using (
    is_published
    or (select public.has_permission('STAGE_CREATE'))
    or (select public.has_permission('STAGE_UPDATE'))
    or (select public.has_permission('STAGE_VIEW_REGISTRATIONS'))
  );
create policy "Créer un stage"
  on public.stages for insert to authenticated
  with check ((select public.has_permission('STAGE_CREATE')));
create policy "Modifier un stage"
  on public.stages for update to authenticated
  using ((select public.has_permission('STAGE_UPDATE')))
  with check ((select public.has_permission('STAGE_UPDATE')));
create policy "Supprimer un stage"
  on public.stages for delete to authenticated
  using ((select public.has_permission('STAGE_DELETE')));

-- Les tarifs suivent la visibilité de leur stage.
create policy "Lire les tarifs"
  on public.stage_prices for select to authenticated
  using (exists (select 1 from public.stages s where s.id = stage_prices.stage_id));
create policy "Ajouter un tarif"
  on public.stage_prices for insert to authenticated
  with check ((select public.has_permission('STAGE_CREATE')) or (select public.has_permission('STAGE_UPDATE')));
create policy "Modifier un tarif"
  on public.stage_prices for update to authenticated
  using ((select public.has_permission('STAGE_UPDATE')))
  with check ((select public.has_permission('STAGE_UPDATE')));
create policy "Supprimer un tarif"
  on public.stage_prices for delete to authenticated
  using ((select public.has_permission('STAGE_UPDATE')));

create policy "Lire ses commandes ou celles de son périmètre"
  on public.orders for select to authenticated
  using (
    account_id = (select auth.uid())
    or (select public.has_permission('PAYMENT_VIEW'))
    or (type = 'shop' and (select public.has_permission('VOLANT_VIEW_SALES')))
    or (type = 'stage' and (select public.has_permission('STAGE_VIEW_REGISTRATIONS')))
  );
-- Seule la remise des articles (picked_up_at) est modifiable, par la boutique.
create policy "Marquer une commande comme remise"
  on public.orders for update to authenticated
  using (
    type = 'shop' and status = 'paid'
    and ((select public.has_permission('VOLANT_VIEW_SALES')) or (select public.has_permission('VOLANT_MANAGE')))
  )
  with check (
    type = 'shop' and status = 'paid'
    and ((select public.has_permission('VOLANT_VIEW_SALES')) or (select public.has_permission('VOLANT_MANAGE')))
  );

create policy "Lire les lignes de ses commandes"
  on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_items.order_id));

create policy "Lire ses inscriptions ou celles des stages"
  on public.stage_registrations for select to authenticated
  using (
    exists (
      select 1 from public.members m
      where m.id = stage_registrations.member_id and m.account_id = (select auth.uid())
    )
    or (select public.has_permission('STAGE_VIEW_REGISTRATIONS'))
  );
