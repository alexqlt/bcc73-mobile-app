-- Comptes archivés et bloqués : la personne ne peut plus se connecter (connexion refusée par Supabase
-- Auth, sessions en cours coupées) et l'app lui demande de se rendre au club.
--   - archivé : réactivable par un administrateur ou un responsable des licences (MEMBER_MANAGE) ;
--   - bloqué  : plus aucun accès, seul un administrateur peut le réactiver.
-- Archiver et bloquer sont réservés aux administrateurs. La suppression complète passe par l'Edge
-- Function admin-delete-account.

create type public.account_status as enum ('active', 'archived', 'blocked');

alter table public.accounts
  add column status public.account_status not null default 'active',
  add column status_changed_at timestamptz;

comment on column public.accounts.status is
  'active, archived (réactivable par MEMBER_MANAGE) ou blocked (réactivable par un administrateur seulement).';

-- Nom lisible d'un compte pour le journal : titulaire, sinon email.
create function public.account_display_name(account uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select m.first_name || ' ' || m.last_name from public.members m
     where m.account_id = account and m.is_account_holder and m.status <> 'rejected' limit 1),
    (select u.email::text from auth.users u where u.id = account)
  );
$$;

revoke execute on function public.account_display_name(uuid) from public, anon, authenticated;

create function public.set_account_status(account uuid, new_status public.account_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status public.account_status;
begin
  select status into current_status from public.accounts where id = account;
  if current_status is null then
    raise exception 'Ce compte n''existe plus.' using errcode = 'P0001';
  end if;
  if account = auth.uid() then
    raise exception 'Vous ne pouvez pas modifier l''accès de votre propre compte.' using errcode = 'P0001';
  end if;
  if current_status = new_status then
    return;
  end if;

  -- Réactiver un compte archivé : administrateur ou responsable des licences. Le reste : administrateur.
  if not (
    public.is_admin()
    or (new_status = 'active' and current_status = 'archived' and public.has_permission('MEMBER_MANAGE'))
  ) then
    raise exception 'Vous n''avez pas le droit de modifier l''accès de ce compte.' using errcode = '42501';
  end if;

  update public.accounts set status = new_status, status_changed_at = now() where id = account;

  if new_status = 'active' then
    update auth.users set banned_until = null where id = account;
  else
    -- Connexion refusée par Supabase Auth (« user_banned ») et sessions en cours coupées.
    update auth.users set banned_until = 'infinity' where id = account;
    delete from auth.sessions where user_id = account;
  end if;

  insert into public.audit_logs (actor_id, action, target_type, target_id, details)
  values (
    auth.uid(),
    case new_status when 'archived' then 'archive' when 'blocked' then 'block' else 'reactivate' end,
    'accounts',
    account::text,
    jsonb_strip_nulls(jsonb_build_object('person', public.account_display_name(account), 'previous_status', current_status))
  );
end;
$$;

revoke execute on function public.set_account_status(uuid, public.account_status) from public, anon;
grant execute on function public.set_account_status(uuid, public.account_status) to authenticated;

-- Listes du back-office : statut du compte en plus.
drop function public.admin_list_users();
create function public.admin_list_users()
returns table (
  id uuid,
  email text,
  avatar_path text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  role_ids uuid[],
  account_status public.account_status,
  display_name text
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
           coalesce(array_agg(ar.role_id) filter (where ar.role_id is not null), '{}'),
           a.status,
           (select m.first_name || ' ' || m.last_name from public.members m
            where m.account_id = u.id and m.is_account_holder and m.status <> 'rejected' limit 1)
    from auth.users u
    join public.accounts a on a.id = u.id
    left join public.account_roles ar on ar.account_id = u.id
    group by u.id, a.avatar_path, a.status
    order by u.created_at desc;
end;
$$;
revoke execute on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

drop function public.admin_list_members();
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
  created_at timestamptz,
  account_status public.account_status
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
           m.is_account_holder, m.status, m.rejection_reason, m.reviewed_at, m.created_at, a.status
    from public.members m
    join auth.users u on u.id = m.account_id
    left join public.accounts a on a.id = m.account_id
    order by m.created_at desc;
end;
$$;
revoke execute on function public.admin_list_members() from public, anon;
grant execute on function public.admin_list_members() to authenticated;
