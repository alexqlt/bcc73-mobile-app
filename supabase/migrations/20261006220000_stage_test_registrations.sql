-- Mode test des stages, réservé au rôle Administrateur : inscription sans paiement.
--
-- admin_test_stage_registration() suit exactement le parcours réel (create_stage_registrations :
-- tarif disponible, places par jour, pas de doublon), puis confirme l'inscription sans HelloAsso.
-- La commande est marquée provider = 'test' : elle est exclue des statistiques de ventes et peut être
-- annulée (places libérées) par admin_cancel_test_order(). Aucun email n'est envoyé.

create function public.admin_test_stage_registration(stage uuid, member_ids uuid[], price uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_order uuid;
begin
  if not public.is_admin() then
    raise exception 'Le mode test est réservé aux administrateurs.' using errcode = '42501';
  end if;
  new_order := public.create_stage_registrations(stage, member_ids, price);
  update public.orders set provider = 'test' where id = new_order;
  perform public.confirm_order_payment(new_order, 'TEST');
  return new_order;
end;
$$;

create function public.admin_cancel_test_order(order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Le mode test est réservé aux administrateurs.' using errcode = '42501';
  end if;
  update public.orders set status = 'cancelled', cancelled_at = now()
  where id = order_id and provider = 'test' and status <> 'cancelled';
  if not found then
    raise exception 'Seule une commande de test peut être annulée ici.' using errcode = 'P0001';
  end if;
  update public.stage_registrations set status = 'cancelled', cancelled_at = now()
  where stage_registrations.order_id = admin_cancel_test_order.order_id and status <> 'cancelled';
end;
$$;

revoke execute on function public.admin_test_stage_registration(uuid, uuid[], uuid) from public, anon;
revoke execute on function public.admin_cancel_test_order(uuid) from public, anon;
grant execute on function public.admin_test_stage_registration(uuid, uuid[], uuid) to authenticated;
grant execute on function public.admin_cancel_test_order(uuid) to authenticated;
