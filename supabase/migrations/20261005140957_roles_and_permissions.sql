-- P2-01 à P2-05 et P2-11 — Rôles, permissions et journal (APP.md §3 « Une vraie gestion des rôles »).
--
-- Un compte reçoit des rôles ; un rôle regroupe des permissions (NEWS_CREATE, MEMBER_MANAGE…).
-- Toutes les vérifications ont lieu dans la base (RLS + fonctions) : l'application et le
-- back-office ne font qu'afficher ce que la base autorise.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.permissions (
  code text primary key check (code ~ '^[A-Z_]+$'),
  description text not null
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) between 1 and 60),
  description text,
  -- Rôle Administrateur : toutes les permissions, ni modifiable ni supprimable.
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_code text not null references public.permissions (code) on update cascade on delete cascade,
  primary key (role_id, permission_code)
);

create table public.account_roles (
  account_id uuid not null references public.accounts (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  granted_by uuid references public.accounts (id) on delete set null default auth.uid(),
  granted_at timestamptz not null default now(),
  primary key (account_id, role_id)
);

create index role_permissions_permission_code_idx on public.role_permissions (permission_code);
create index account_roles_role_id_idx on public.account_roles (role_id);

-- Journal des actions administratives (RGPD : savoir qui a fait quoi).
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.accounts (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- Vérification des permissions
-- ---------------------------------------------------------------------------

create function public.has_permission(permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.account_roles ar
    join public.role_permissions rp on rp.role_id = ar.role_id
    where ar.account_id = (select auth.uid())
      and rp.permission_code = permission
  );
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.account_roles ar
    join public.roles r on r.id = ar.role_id
    where ar.account_id = (select auth.uid())
      and r.is_system
  );
$$;

create function public.is_system_role(role uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select is_system from public.roles where id = role), false);
$$;

-- P2-05 : ce que l'utilisateur connecté a le droit de faire (consommé par l'app et le back-office).
create function public.my_permissions()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select distinct rp.permission_code
  from public.account_roles ar
  join public.role_permissions rp on rp.role_id = ar.role_id
  where ar.account_id = (select auth.uid())
  order by 1;
$$;

revoke execute on function public.has_permission(text) from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_system_role(uuid) from public, anon;
revoke execute on function public.my_permissions() from public, anon;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_system_role(uuid) to authenticated;
grant execute on function public.my_permissions() to authenticated;

-- ---------------------------------------------------------------------------
-- Journal : enregistrement automatique des changements de rôles et de droits
-- ---------------------------------------------------------------------------

create function public.audit_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_row jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  new_row jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  insert into public.audit_logs (actor_id, action, target_type, target_id, details)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    coalesce(new_row, old_row) ->> 'id',
    jsonb_strip_nulls(jsonb_build_object('old', old_row, 'new', new_row))
  );
  return coalesce(new, old);
end;
$$;

create trigger roles_audit
  after insert or update or delete on public.roles
  for each row execute function public.audit_change();

create trigger role_permissions_audit
  after insert or delete on public.role_permissions
  for each row execute function public.audit_change();

create trigger account_roles_audit
  after insert or delete on public.account_roles
  for each row execute function public.audit_change();

-- Garde-fou : le club garde toujours au moins un administrateur.
create function public.prevent_last_admin_removal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_system_role(old.role_id) and not exists (
    select 1 from public.account_roles
    where role_id = old.role_id and account_id <> old.account_id
  ) then
    raise exception 'Impossible de retirer le dernier administrateur.' using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create trigger account_roles_keep_one_admin
  before delete on public.account_roles
  for each row execute function public.prevent_last_admin_removal();

revoke execute on function public.audit_change() from public, anon, authenticated;
revoke execute on function public.prevent_last_admin_removal() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Droits et RLS
-- ---------------------------------------------------------------------------

revoke all on public.permissions, public.roles, public.role_permissions, public.account_roles, public.audit_logs
  from anon, authenticated;

grant select on public.permissions to authenticated;
grant select, delete on public.roles to authenticated;
grant insert (name, description), update (name, description) on public.roles to authenticated;
grant select, insert, delete on public.role_permissions to authenticated;
grant select, delete on public.account_roles to authenticated;
grant insert (account_id, role_id) on public.account_roles to authenticated;
grant select on public.audit_logs to authenticated;

alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.account_roles enable row level security;
alter table public.audit_logs enable row level security;

create policy "Lire les permissions"
  on public.permissions for select
  to authenticated
  using (true);

create policy "Lire les rôles"
  on public.roles for select
  to authenticated
  using (
    (select public.has_permission('ROLE_MANAGE'))
    or (select public.has_permission('USER_MANAGE'))
    or exists (select 1 from public.account_roles ar where ar.role_id = roles.id and ar.account_id = (select auth.uid()))
  );

create policy "Créer un rôle"
  on public.roles for insert
  to authenticated
  with check ((select public.has_permission('ROLE_MANAGE')));

create policy "Modifier un rôle"
  on public.roles for update
  to authenticated
  using ((select public.has_permission('ROLE_MANAGE')) and not is_system)
  with check ((select public.has_permission('ROLE_MANAGE')) and not is_system);

create policy "Supprimer un rôle"
  on public.roles for delete
  to authenticated
  using ((select public.has_permission('ROLE_MANAGE')) and not is_system);

create policy "Lire les permissions des rôles"
  on public.role_permissions for select
  to authenticated
  using (
    (select public.has_permission('ROLE_MANAGE'))
    or (select public.has_permission('USER_MANAGE'))
    or exists (select 1 from public.account_roles ar where ar.role_id = role_permissions.role_id and ar.account_id = (select auth.uid()))
  );

create policy "Ajouter une permission à un rôle"
  on public.role_permissions for insert
  to authenticated
  with check ((select public.has_permission('ROLE_MANAGE')) and not public.is_system_role(role_id));

create policy "Retirer une permission d'un rôle"
  on public.role_permissions for delete
  to authenticated
  using ((select public.has_permission('ROLE_MANAGE')) and not public.is_system_role(role_id));

create policy "Lire ses rôles ou ceux des utilisateurs"
  on public.account_roles for select
  to authenticated
  using (account_id = (select auth.uid()) or (select public.has_permission('USER_MANAGE')));

-- Seul un administrateur peut donner ou retirer le rôle Administrateur (pas d'escalade de droits).
create policy "Attribuer un rôle"
  on public.account_roles for insert
  to authenticated
  with check (
    (select public.has_permission('USER_MANAGE'))
    and (not public.is_system_role(role_id) or (select public.is_admin()))
  );

create policy "Retirer un rôle"
  on public.account_roles for delete
  to authenticated
  using (
    (select public.has_permission('USER_MANAGE'))
    and (not public.is_system_role(role_id) or (select public.is_admin()))
  );

create policy "Lire le journal"
  on public.audit_logs for select
  to authenticated
  using ((select public.has_permission('USER_MANAGE')) or (select public.has_permission('ROLE_MANAGE')));

-- Accès des responsables aux comptes et membres de tous les adhérents.
create policy "Lire tous les comptes (responsables)"
  on public.accounts for select
  to authenticated
  using ((select public.has_permission('MEMBER_VIEW')) or (select public.has_permission('USER_MANAGE')));

create policy "Lire tous les membres (responsables)"
  on public.members for select
  to authenticated
  using ((select public.has_permission('MEMBER_VIEW')));

-- ---------------------------------------------------------------------------
-- Fonctions du back-office
-- ---------------------------------------------------------------------------

create function public.require_permission(permission text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission(permission) then
    raise exception 'Accès refusé : permission % requise.', permission using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public.require_permission(text) from public, anon, authenticated;

-- Membres avec l'email du compte (l'email reste dans auth.users, inaccessible directement).
create function public.admin_list_members()
returns table (
  id uuid,
  account_id uuid,
  email text,
  license_number text,
  first_name text,
  last_name text,
  is_account_holder boolean,
  status public.member_status,
  rejection_reason text,
  reviewed_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_permission('MEMBER_VIEW');
  return query
    select m.id, m.account_id, u.email::text, m.license_number, m.first_name, m.last_name,
           m.is_account_holder, m.status, m.rejection_reason, m.reviewed_at, m.created_at
    from public.members m
    join auth.users u on u.id = m.account_id
    order by m.created_at desc;
end;
$$;

-- Utilisateurs (comptes de connexion) avec leurs rôles.
create function public.admin_list_users()
returns table (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  role_ids uuid[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_permission('USER_MANAGE');
  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at,
           coalesce(array_agg(ar.role_id) filter (where ar.role_id is not null), '{}')
    from auth.users u
    join public.accounts a on a.id = u.id
    left join public.account_roles ar on ar.account_id = u.id
    group by u.id
    order by u.created_at desc;
end;
$$;

revoke execute on function public.admin_list_members() from public, anon;
revoke execute on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_members() to authenticated;
grant execute on function public.admin_list_users() to authenticated;

-- P1-09 : la validation des licences devient accessible aux responsables (permission MEMBER_MANAGE)
-- et chaque décision est inscrite au journal.
create or replace function public.approve_member(member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Depuis l'éditeur SQL (aucun utilisateur connecté), la vérification ne s'applique pas.
  if auth.uid() is not null then
    perform public.require_permission('MEMBER_MANAGE');
  end if;

  update public.members
  set status = 'approved', rejection_reason = null, reviewed_at = now()
  where id = member_id;

  insert into public.audit_logs (actor_id, action, target_type, target_id)
  values (auth.uid(), 'approve', 'members', member_id::text);
end;
$$;

create or replace function public.reject_member(member_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    perform public.require_permission('MEMBER_MANAGE');
  end if;

  update public.members
  set status = 'rejected', rejection_reason = reason, reviewed_at = now()
  where id = member_id;

  insert into public.audit_logs (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'reject', 'members', member_id::text, jsonb_build_object('reason', reason));
end;
$$;

revoke execute on function public.approve_member(uuid) from public, anon;
revoke execute on function public.reject_member(uuid, text) from public, anon;
grant execute on function public.approve_member(uuid) to authenticated;
grant execute on function public.reject_member(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- P2-02 et P2-03 — Permissions et rôles de base
-- ---------------------------------------------------------------------------

insert into public.permissions (code, description) values
  ('NEWS_READ', 'Lire les actualités'),
  ('NEWS_CREATE', 'Créer une actualité'),
  ('NEWS_UPDATE', 'Modifier une actualité'),
  ('NEWS_DELETE', 'Supprimer une actualité'),
  ('SCHEDULE_READ', 'Consulter le planning'),
  ('SCHEDULE_CREATE', 'Ajouter un créneau'),
  ('SCHEDULE_UPDATE', 'Modifier un créneau'),
  ('SCHEDULE_DELETE', 'Supprimer un créneau'),
  ('STAGE_READ', 'Consulter les stages'),
  ('STAGE_CREATE', 'Créer un stage'),
  ('STAGE_UPDATE', 'Modifier un stage'),
  ('STAGE_DELETE', 'Supprimer un stage'),
  ('STAGE_VIEW_REGISTRATIONS', 'Voir les inscrits aux stages'),
  ('VOLANT_VIEW_SALES', 'Voir les ventes de volants'),
  ('VOLANT_MANAGE', 'Gérer les produits de la boutique'),
  ('MEMBER_VIEW', 'Voir les adhérents'),
  ('MEMBER_MANAGE', 'Valider ou refuser les licences des adhérents'),
  ('PAYMENT_VIEW', 'Voir les paiements'),
  ('USER_MANAGE', 'Gérer les utilisateurs et leur attribuer des rôles'),
  ('ROLE_MANAGE', 'Créer et modifier les rôles');

insert into public.roles (name, description, is_system) values
  ('Administrateur', 'Toutes les permissions.', true),
  ('Secrétariat', 'Validation des licences et suivi des adhérents.', false),
  ('Communication', 'Publication des actualités.', false),
  ('Responsable stages', 'Organisation des stages et suivi des inscriptions.', false),
  ('Responsable boutique', 'Suivi des ventes de volants.', false);

-- L'administrateur a toutes les permissions (penser à l'ajouter quand une permission est créée).
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code from public.roles r cross join public.permissions p
where r.name = 'Administrateur';

insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
join (values
  ('Secrétariat', 'MEMBER_VIEW'),
  ('Secrétariat', 'MEMBER_MANAGE'),
  ('Communication', 'NEWS_CREATE'),
  ('Communication', 'NEWS_UPDATE'),
  ('Communication', 'NEWS_DELETE'),
  ('Responsable stages', 'STAGE_CREATE'),
  ('Responsable stages', 'STAGE_UPDATE'),
  ('Responsable stages', 'STAGE_VIEW_REGISTRATIONS'),
  ('Responsable boutique', 'VOLANT_VIEW_SALES')
) as p (role_name, code) on p.role_name = r.name;

-- Le journal démarre après l'installation : on efface les lignes créées par les insertions ci-dessus.
delete from public.audit_logs;
