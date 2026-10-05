-- Un compte archivé ou bloqué perd immédiatement ses permissions et le rôle Administrateur, même si
-- son jeton de connexion est encore valide (au plus une heure).

create or replace function public.has_permission(permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.account_roles ar
    join public.accounts a on a.id = ar.account_id and a.status = 'active'
    join public.role_permissions rp on rp.role_id = ar.role_id
    where ar.account_id = (select auth.uid())
      and rp.permission_code = permission
  );
$$;

create or replace function public.my_permissions()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select distinct rp.permission_code
  from public.account_roles ar
  join public.accounts a on a.id = ar.account_id and a.status = 'active'
  join public.role_permissions rp on rp.role_id = ar.role_id
  where ar.account_id = (select auth.uid())
  order by 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.account_roles ar
    join public.accounts a on a.id = ar.account_id and a.status = 'active'
    join public.roles r on r.id = ar.role_id
    where ar.account_id = (select auth.uid())
      and r.is_system
  );
$$;
