-- Journal : chaque responsable lit les événements de son domaine.
--
-- Avant : seuls USER_MANAGE et ROLE_MANAGE lisaient le journal. Désormais une ligne est visible
-- selon sa table d'origine (target_type) et les permissions du lecteur :
--   members (licences)                                   MEMBER_VIEW, MEMBER_MANAGE
--   roles, role_permissions, account_roles, accounts,
--   audit_logs (journal vidé)                            USER_MANAGE, ROLE_MANAGE
--   news                                                 NEWS_CREATE, NEWS_UPDATE, NEWS_DELETE
--   schedule_periods, schedules, schedule_cancellations  SCHEDULE_CREATE, SCHEDULE_UPDATE, SCHEDULE_DELETE
--   products                                             VOLANT_MANAGE, VOLANT_VIEW_SALES
--   stages, stage_prices                                 STAGE_CREATE, STAGE_UPDATE, STAGE_DELETE, STAGE_VIEW_REGISTRATIONS
-- Le back-office reprend la même correspondance (admin/src/lib/journal.ts) pour l'affichage.

-- Tables du journal que l'utilisateur connecté peut lire (calculé une fois par requête).
create function public.readable_audit_targets()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct target), '{}')
  from (
    values
      ('members', 'MEMBER_VIEW'), ('members', 'MEMBER_MANAGE'),
      ('roles', 'USER_MANAGE'), ('roles', 'ROLE_MANAGE'),
      ('role_permissions', 'USER_MANAGE'), ('role_permissions', 'ROLE_MANAGE'),
      ('account_roles', 'USER_MANAGE'), ('account_roles', 'ROLE_MANAGE'),
      ('accounts', 'USER_MANAGE'), ('accounts', 'ROLE_MANAGE'),
      ('audit_logs', 'USER_MANAGE'), ('audit_logs', 'ROLE_MANAGE'),
      ('news', 'NEWS_CREATE'), ('news', 'NEWS_UPDATE'), ('news', 'NEWS_DELETE'),
      ('schedule_periods', 'SCHEDULE_CREATE'), ('schedule_periods', 'SCHEDULE_UPDATE'), ('schedule_periods', 'SCHEDULE_DELETE'),
      ('schedules', 'SCHEDULE_CREATE'), ('schedules', 'SCHEDULE_UPDATE'), ('schedules', 'SCHEDULE_DELETE'),
      ('schedule_cancellations', 'SCHEDULE_CREATE'), ('schedule_cancellations', 'SCHEDULE_UPDATE'),
      ('schedule_cancellations', 'SCHEDULE_DELETE'),
      ('products', 'VOLANT_MANAGE'), ('products', 'VOLANT_VIEW_SALES'),
      ('stages', 'STAGE_CREATE'), ('stages', 'STAGE_UPDATE'), ('stages', 'STAGE_DELETE'), ('stages', 'STAGE_VIEW_REGISTRATIONS'),
      ('stage_prices', 'STAGE_CREATE'), ('stage_prices', 'STAGE_UPDATE'), ('stage_prices', 'STAGE_DELETE'),
      ('stage_prices', 'STAGE_VIEW_REGISTRATIONS')
  ) as mapping (target, permission)
  where public.has_permission(permission);
$$;

revoke execute on function public.readable_audit_targets() from public, anon;
grant execute on function public.readable_audit_targets() to authenticated;

drop policy "Lire le journal" on public.audit_logs;

create policy "Lire le journal de son domaine"
  on public.audit_logs for select to authenticated
  using (target_type = any ((select public.readable_audit_targets())::text[]));

-- Emails des auteurs des lignes que le lecteur peut voir (sans donner accès à la liste des comptes).
create function public.journal_actor_emails()
returns table (id uuid, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct u.id, u.email::text
  from public.audit_logs l
  join auth.users u on u.id = l.actor_id
  where l.target_type = any (public.readable_audit_targets());
$$;

revoke execute on function public.journal_actor_emails() from public, anon;
grant execute on function public.journal_actor_emails() to authenticated;
