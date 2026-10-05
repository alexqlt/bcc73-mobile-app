-- Journal : la validation ou le refus d'une licence garde le membre concerné (nom, licence, statut
-- précédent), lisible même si la licence est retirée ensuite. Les lignes existantes sont complétées
-- à partir des fiches des membres encore présentes.

create or replace function public.approve_member(member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  member record;
begin
  -- Depuis l'éditeur SQL (aucun utilisateur connecté), la vérification ne s'applique pas.
  if auth.uid() is not null then
    perform public.require_permission('MEMBER_MANAGE');
  end if;

  select first_name, last_name, license_number, status into member
  from public.members where id = member_id;

  update public.members
  set status = 'approved', rejection_reason = null, reviewed_at = now()
  where id = member_id;

  insert into public.audit_logs (actor_id, action, target_type, target_id, details)
  values (
    auth.uid(), 'approve', 'members', member_id::text,
    jsonb_strip_nulls(jsonb_build_object(
      'member', member.first_name || ' ' || member.last_name,
      'license_number', member.license_number,
      'previous_status', member.status
    ))
  );
end;
$$;

create or replace function public.reject_member(member_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  member record;
begin
  if auth.uid() is not null then
    perform public.require_permission('MEMBER_MANAGE');
  end if;

  select first_name, last_name, license_number, status into member
  from public.members where id = member_id;

  update public.members
  set status = 'rejected', rejection_reason = reason, reviewed_at = now()
  where id = member_id;

  insert into public.audit_logs (actor_id, action, target_type, target_id, details)
  values (
    auth.uid(), 'reject', 'members', member_id::text,
    jsonb_strip_nulls(jsonb_build_object(
      'member', member.first_name || ' ' || member.last_name,
      'license_number', member.license_number,
      'previous_status', member.status,
      'reason', reason
    ))
  );
end;
$$;

-- Lignes déjà enregistrées : nom et licence repris de la fiche du membre (le statut précédent n'est
-- pas connu pour elles).
update public.audit_logs l
set details = l.details || jsonb_build_object('member', m.first_name || ' ' || m.last_name, 'license_number', m.license_number)
from public.members m
where l.target_type = 'members'
  and l.action in ('approve', 'reject')
  and m.id::text = l.target_id
  and not (l.details ? 'member');
