-- Page de connexion du back-office : prénom et nom des administrateurs (comptes actifs) à contacter en
-- cas de problème. Lisible sans être connecté ; ne renvoie rien d'autre (ni email, ni identifiant).

create function public.admin_contact_names()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select name
  from (
    select distinct on (a.id)
      m.first_name || ' ' || m.last_name as name
    from public.accounts a
    join public.account_roles ar on ar.account_id = a.id
    join public.roles r on r.id = ar.role_id and r.is_system
    join public.members m on m.account_id = a.id
    where a.status = 'active'
    order by a.id, m.is_account_holder desc, (m.status = 'rejected'), m.created_at
  ) admins
  order by name;
$$;

revoke execute on function public.admin_contact_names() from public;
grant execute on function public.admin_contact_names() to anon, authenticated;
