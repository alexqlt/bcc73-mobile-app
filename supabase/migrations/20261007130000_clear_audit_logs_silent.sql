-- « Tout effacer » vide le journal sans y laisser de trace (demande du club). Toujours réservé au rôle
-- Administrateur.

create or replace function public.clear_audit_logs()
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
  return deleted;
end;
$$;
