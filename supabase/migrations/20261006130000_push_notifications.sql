-- Phase 7 — Notifications push (APP.md §13 « Les notifications »).
--
-- P7-01 appareils (jetons Expo) de chaque compte, P7-08 préférences par catégorie, P7-02 journal
-- des envois. Les push partent de l'Edge Function send-push (Expo Push Service) ; le journal
-- empêche d'envoyer deux fois la même notification (une actualité réenregistrée, un webhook rejoué…).

create type public.notification_category as enum (
  'news',      -- nouvelle actualité
  'stages',    -- nouveau stage ouvert aux inscriptions
  'schedule',  -- créneau annulé
  'payments'   -- paiement confirmé, inscription confirmée
);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  -- ExponentPushToken[…] : un appareil n'appartient qu'au dernier compte connecté dessus.
  token text not null unique check (token ~ '^Expo(nent)?PushToken\[.+\]$'),
  platform text check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index push_tokens_account_id_idx on public.push_tokens (account_id);

-- Une ligne par compte qui a modifié ses préférences ; sans ligne, tout est activé.
create table public.notification_preferences (
  account_id uuid primary key references public.accounts (id) on delete cascade,
  news boolean not null default true,
  stages boolean not null default true,
  schedule boolean not null default true,
  payments boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.notification_log (
  id bigint generated always as identity primary key,
  category public.notification_category not null,
  -- Élément à l'origine de l'envoi (actualité, stage, annulation, commande).
  ref_id uuid not null,
  title text not null,
  body text not null,
  url text,
  recipients integer not null default 0,
  sent_by uuid references public.accounts (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (category, ref_id)
);

create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

-- Chaque compte gère ses appareils et ses préférences ; le journal n'est lu que par les responsables.
revoke all on public.push_tokens, public.notification_preferences, public.notification_log from anon, authenticated;

grant select, delete on public.push_tokens to authenticated;
grant insert (account_id, token, platform), update (account_id, platform, last_seen_at) on public.push_tokens to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant select on public.notification_log to authenticated;

alter table public.push_tokens enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_log enable row level security;

create policy "Gérer ses appareils"
  on public.push_tokens for all to authenticated
  using (account_id = (select auth.uid()))
  with check (account_id = (select auth.uid()));

create policy "Gérer ses préférences de notification"
  on public.notification_preferences for all to authenticated
  using (account_id = (select auth.uid()))
  with check (account_id = (select auth.uid()));

create policy "Lire le journal des notifications"
  on public.notification_log for select to authenticated
  using ((select public.has_permission('USER_MANAGE')) or (select public.has_permission('NEWS_CREATE')));

-- Enregistre l'appareil pour le compte connecté. Un téléphone qui change de compte est rattaché au
-- nouveau (sinon l'ancien compte continuerait d'y recevoir ses notifications).
create function public.register_push_token(push_token text, device_platform text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;
  insert into public.push_tokens (account_id, token, platform)
  values (auth.uid(), push_token, device_platform)
  on conflict (token) do update
    set account_id = excluded.account_id, platform = excluded.platform, last_seen_at = now();
end;
$$;

revoke execute on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;

-- P7-05 : confirm_order_payment indique si le paiement vient d'être confirmé, pour ne prévenir
-- l'adhérent qu'une fois (le retour du navigateur et le webhook peuvent arriver tous les deux).
drop function public.confirm_order_payment(uuid, text);

create function public.confirm_order_payment(order_id uuid, provider_order text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  confirmed boolean;
begin
  update public.orders
  set status = 'paid', paid_at = coalesce(paid_at, now()), cancelled_at = null,
      provider_order_id = coalesce(provider_order, provider_order_id)
  where id = order_id and status <> 'paid';
  confirmed := found;

  -- Même payée après le délai, l'inscription est confirmée : le club a reçu l'argent.
  update public.stage_registrations
  set status = 'confirmed', confirmed_at = coalesce(confirmed_at, now()), cancelled_at = null
  where stage_registrations.order_id = confirm_order_payment.order_id and status <> 'confirmed';

  return confirmed;
end;
$$;

revoke execute on function public.confirm_order_payment(uuid, text) from public, anon, authenticated;
grant execute on function public.confirm_order_payment(uuid, text) to service_role;
