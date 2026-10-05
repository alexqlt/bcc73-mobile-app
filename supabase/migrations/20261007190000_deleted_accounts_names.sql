-- Journal cohérent après la suppression d'un compte : son prénom et son nom (l'email à défaut) sont
-- gardés dans deleted_accounts, et les lignes du journal gardent l'identifiant de leur auteur (plus
-- de remise à vide). journal_people() lit les comptes existants puis les comptes supprimés.

create table public.deleted_accounts (
  id uuid primary key,
  display_name text not null,
  deleted_at timestamptz not null default now()
);

comment on table public.deleted_accounts is
  'Nom des comptes supprimés, pour que le journal continue de les nommer. Lu par journal_people().';

alter table public.deleted_accounts enable row level security;
revoke all on public.deleted_accounts from anon, authenticated;

-- Avant la suppression de l'utilisateur Auth : membres et email encore lisibles.
create function public.remember_deleted_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.deleted_accounts (id, display_name)
  values (
    old.id,
    coalesce(
      (select m.first_name || ' ' || m.last_name
       from public.members m
       where m.account_id = old.id
       order by m.is_account_holder desc, (m.status = 'rejected'), m.created_at
       limit 1),
      old.email::text,
      'Compte supprimé'
    )
  )
  on conflict (id) do update set display_name = excluded.display_name, deleted_at = now();
  return old;
end;
$$;

revoke execute on function public.remember_deleted_account() from public, anon, authenticated;

create trigger remember_deleted_account
  before delete on auth.users
  for each row execute function public.remember_deleted_account();

-- L'auteur d'une ligne reste connu après la suppression de son compte.
alter table public.audit_logs drop constraint audit_logs_actor_id_fkey;

create or replace function public.journal_people()
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
  select p.account_id,
         coalesce(
           (select m.first_name || ' ' || m.last_name
            from public.members m
            where m.account_id = u.id
            order by m.is_account_holder desc, (m.status = 'rejected'), m.created_at
            limit 1),
           u.email::text,
           d.display_name
         )
  from people p
  left join auth.users u on u.id = p.account_id
  left join public.deleted_accounts d on d.id = p.account_id
  where u.id is not null or d.id is not null;
$$;
