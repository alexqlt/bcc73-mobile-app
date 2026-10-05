-- P1-01 — Comptes et membres (APP.md §4 « Gestion des familles » et §19 « Modèle de données »).
--
-- Un compte (accounts) correspond à un utilisateur Supabase Auth (email + mot de passe).
-- Il regroupe un ou plusieurs membres (members) : le titulaire du compte et, par exemple, ses enfants.
-- Chaque membre porte un numéro de licence FFBaD, validé manuellement par un responsable du club.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.member_status as enum (
  'pending',  -- licence saisie, en attente de validation par le club
  'approved', -- licence vérifiée : le membre appartient bien au club
  'rejected'  -- licence refusée (inconnue, mauvaise personne…), voir rejection_reason
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text,
  created_at timestamptz not null default now()
);

comment on table public.accounts is
  'Compte de connexion (1 pour 1 avec auth.users). L''email reste dans auth.users pour ne pas le dupliquer.';

create table public.members (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  license_number text not null check (license_number ~ '^\d{8}$'),
  first_name text not null check (char_length(trim(first_name)) between 1 and 100),
  last_name text not null check (char_length(trim(last_name)) between 1 and 100),
  is_account_holder boolean not null default false,
  status public.member_status not null default 'pending',
  rejection_reason text,
  reviewed_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.members is
  'Personne licenciée rattachée à un compte (titulaire ou enfant). Le statut est géré par le club.';
comment on column public.members.is_account_holder is
  'true pour la personne qui a créé le compte, false pour les membres rattachés (enfants).';

-- Une licence ne peut appartenir qu'à un seul membre (les demandes refusées ne comptent pas).
create unique index members_license_number_key
  on public.members (license_number)
  where status <> 'rejected';

-- Un seul titulaire par compte (une demande refusée peut être refaite).
create unique index members_one_holder_per_account
  on public.members (account_id)
  where is_account_holder and status <> 'rejected';

create index members_account_id_idx on public.members (account_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Crée automatiquement le compte à l'inscription d'un utilisateur.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.accounts (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Met à jour updated_at à chaque modification.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger members_set_updated_at
  before update on public.members
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Droits : l'application ne peut ni choisir ni modifier le statut d'un membre
-- ---------------------------------------------------------------------------

revoke all on public.accounts from anon, authenticated;
revoke all on public.members from anon, authenticated;

grant select on public.accounts to authenticated;
grant update (phone) on public.accounts to authenticated;

grant select, delete on public.members to authenticated;
grant insert (account_id, license_number, first_name, last_name, is_account_holder)
  on public.members to authenticated;
grant update (license_number, first_name, last_name) on public.members to authenticated;

alter table public.accounts enable row level security;
alter table public.members enable row level security;

create policy "Lire son compte"
  on public.accounts for select
  to authenticated
  using (id = (select auth.uid()));

create policy "Modifier son compte"
  on public.accounts for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Lire les membres de son compte"
  on public.members for select
  to authenticated
  using (account_id = (select auth.uid()));

create policy "Ajouter un membre à son compte"
  on public.members for insert
  to authenticated
  with check (account_id = (select auth.uid()));

-- Une fois validé, un membre n'est plus modifiable par l'utilisateur (sinon il pourrait changer de licence).
create policy "Modifier un membre en attente"
  on public.members for update
  to authenticated
  using (account_id = (select auth.uid()) and status = 'pending')
  with check (account_id = (select auth.uid()));

create policy "Retirer un membre non validé"
  on public.members for delete
  to authenticated
  using (account_id = (select auth.uid()) and status <> 'approved');

-- ---------------------------------------------------------------------------
-- Validation manuelle par le club (P1-09)
-- ---------------------------------------------------------------------------
-- En attendant le back-office (phase 2), un responsable valide depuis l'éditeur SQL de Supabase :
--   select public.approve_member('<id du membre>');
--   select public.reject_member('<id du membre>', 'Licence introuvable au club');

create function public.approve_member(member_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.members
  set status = 'approved', rejection_reason = null, reviewed_at = now()
  where id = member_id;
$$;

create function public.reject_member(member_id uuid, reason text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.members
  set status = 'rejected', rejection_reason = reason, reviewed_at = now()
  where id = member_id;
$$;

-- Réservées au club : jamais appelables depuis l'application.
revoke execute on function public.approve_member(uuid) from public, anon, authenticated;
revoke execute on function public.reject_member(uuid, text) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
