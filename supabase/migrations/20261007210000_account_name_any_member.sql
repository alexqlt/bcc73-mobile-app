-- Journal : nom d'un compte = prénom et nom de son titulaire, sinon de son premier membre ; l'email
-- seulement pour un compte sans aucun membre. Les lignes déjà écrites avec l'email sont corrigées.

create or replace function public.account_display_name(account uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select m.first_name || ' ' || m.last_name
     from public.members m
     where m.account_id = account
     order by m.is_account_holder desc, (m.status = 'rejected'), m.created_at
     limit 1),
    (select u.email::text from auth.users u where u.id = account)
  );
$$;

update public.audit_logs l
set details = l.details || jsonb_build_object('person', public.account_display_name(l.target_id::uuid))
where l.target_type = 'accounts'
  and l.details ? 'person'
  and l.details ->> 'person' like '%@%'
  and public.account_display_name(l.target_id::uuid) not like '%@%';
