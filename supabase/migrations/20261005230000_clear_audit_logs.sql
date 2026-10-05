-- Journal : effacement complet, réservé au rôle Administrateur.
--
-- Personne ne peut supprimer de ligne du journal directement (aucun droit DELETE) ; cette fonction
-- vérifie le rôle, vide le journal et y laisse une trace de l'effacement (qui, combien de lignes).

create function public.clear_audit_logs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted integer;
begin
  if not public.is_admin() then
    raise exception 'Seul un administrateur peut effacer le journal.' using errcode = '42501';
  end if;

  delete from public.audit_logs where true;
  get diagnostics deleted = row_count;

  insert into public.audit_logs (actor_id, action, target_type, details)
  values (auth.uid(), 'clear', 'audit_logs', jsonb_build_object('deleted', deleted));

  return deleted;
end;
$$;

revoke execute on function public.clear_audit_logs() from public, anon;
grant execute on function public.clear_audit_logs() to authenticated;
