-- Le back-office affiche la photo de profil (accounts.avatar_path, P1-20) dans les listes
-- d'utilisateurs et d'adhérents. Le type de retour change : les fonctions sont recréées.

drop function public.admin_list_members();
drop function public.admin_list_users();

-- Membres avec l'email et la photo du compte (l'email reste dans auth.users, inaccessible directement).
create function public.admin_list_members()
returns table (
  id uuid,
  account_id uuid,
  email text,
  avatar_path text,
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
    select m.id, m.account_id, u.email::text, a.avatar_path, m.license_number, m.first_name, m.last_name,
           m.is_account_holder, m.status, m.rejection_reason, m.reviewed_at, m.created_at
    from public.members m
    join auth.users u on u.id = m.account_id
    left join public.accounts a on a.id = m.account_id
    order by m.created_at desc;
end;
$$;

-- Utilisateurs (comptes de connexion) avec leur photo et leurs rôles.
create function public.admin_list_users()
returns table (
  id uuid,
  email text,
  avatar_path text,
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
    select u.id, u.email::text, a.avatar_path, u.created_at, u.last_sign_in_at,
           coalesce(array_agg(ar.role_id) filter (where ar.role_id is not null), '{}')
    from auth.users u
    join public.accounts a on a.id = u.id
    left join public.account_roles ar on ar.account_id = u.id
    group by u.id, a.avatar_path
    order by u.created_at desc;
end;
$$;

revoke execute on function public.admin_list_members() from public, anon;
revoke execute on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_members() to authenticated;
grant execute on function public.admin_list_users() to authenticated;
