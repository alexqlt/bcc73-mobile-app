-- Lignes du journal d'un compte supprimé écrites avec son email : nom gardé dans deleted_accounts.
update public.audit_logs l
set details = l.details || jsonb_build_object('person', d.display_name)
from public.deleted_accounts d
where l.target_type = 'accounts'
  and d.id::text = l.target_id
  and l.details ->> 'person' like '%@%'
  and d.display_name not like '%@%';
