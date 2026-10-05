-- Journal : les personnes sont affichées par leur prénom et leur nom plutôt que par leur email.
--
-- journal_people() remplace journal_actor_emails() : pour les auteurs des lignes visibles et les
-- comptes qu'elles citent (rôle attribué, compte créé…), le nom du titulaire du compte (ou, à défaut,
-- du premier membre rattaché). L'email reste le dernier recours, pour un compte sans membre.

drop function public.journal_actor_emails();

create function public.journal_people()
returns table (id uuid, display_name text)
language sql
stable
security definer
set search_path = ''
as $$
  with visible as (
    select l.actor_id, l.target_type, l.target_id, l.details
    from public.audit_logs l
    where l.target_type = any (public.readable_audit_targets())
  ),
  people as (
    select actor_id as account_id from visible where actor_id is not null
    union
    select (details -> 'new' ->> 'account_id')::uuid from visible where details -> 'new' ? 'account_id'
    union
    select (details -> 'old' ->> 'account_id')::uuid from visible where details -> 'old' ? 'account_id'
    union
    select target_id::uuid from visible where target_type = 'accounts' and target_id is not null
  )
  select u.id,
         coalesce(
           (select m.first_name || ' ' || m.last_name
            from public.members m
            where m.account_id = u.id
            order by m.is_account_holder desc, (m.status = 'rejected'), m.created_at
            limit 1),
           u.email::text
         )
  from people p
  join auth.users u on u.id = p.account_id;
$$;

revoke execute on function public.journal_people() from public, anon;
grant execute on function public.journal_people() to authenticated;
