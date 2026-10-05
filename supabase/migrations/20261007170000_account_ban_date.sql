-- Bannissement Supabase Auth : date lointaine plutôt que « infinity », que Supabase Auth ne sait pas lire.

create or replace function public.set_account_status(account uuid, new_status public.account_status)
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
    update auth.users set banned_until = now() + interval '100 years' where id = account;
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
