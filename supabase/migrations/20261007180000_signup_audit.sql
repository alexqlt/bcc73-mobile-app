-- Journal : création d'un compte depuis l'app, avec le nom et la licence du titulaire. Le compte
-- n'a ni nom ni licence à sa création : la ligne est écrite quand le titulaire est enregistré
-- (première demande seulement, pas quand une demande refusée est refaite). Les comptes existants
-- sont repris à la date de création de leur titulaire.

create function public.audit_account_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_account_holder and not exists (
    select 1 from public.members m where m.account_id = new.account_id and m.is_account_holder and m.id <> new.id
  ) then
    insert into public.audit_logs (actor_id, action, target_type, target_id, details)
    values (
      new.account_id, 'signup', 'members', new.id::text,
      jsonb_build_object('member', new.first_name || ' ' || new.last_name, 'license_number', new.license_number)
    );
  end if;
  return new;
end;
$$;

revoke execute on function public.audit_account_signup() from public, anon, authenticated;

create trigger members_signup_audit
  after insert on public.members
  for each row execute function public.audit_account_signup();

insert into public.audit_logs (actor_id, action, target_type, target_id, details, created_at)
select distinct on (m.account_id)
  m.account_id, 'signup', 'members', m.id::text,
  jsonb_build_object('member', m.first_name || ' ' || m.last_name, 'license_number', m.license_number),
  m.created_at
from public.members m
where m.is_account_holder
order by m.account_id, m.created_at;
