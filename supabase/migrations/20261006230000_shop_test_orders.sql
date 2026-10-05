-- Mode développeur (administrateurs) : achat de volants sans paiement, comme pour les stages
-- (admin_test_stage_registration). La commande suit le parcours réel (create_shop_order : articles
-- en vente, quantités, montant calculé par la base) puis est confirmée sans HelloAsso, marquée
-- provider = 'test' (exclue des ventes, annulable avec admin_cancel_test_order). Aucun email.

create function public.admin_test_shop_order(items jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_order uuid;
begin
  if not public.is_admin() then
    raise exception 'Le mode développeur est réservé aux administrateurs.' using errcode = '42501';
  end if;
  new_order := public.create_shop_order(items);
  update public.orders set provider = 'test' where id = new_order;
  perform public.confirm_order_payment(new_order, 'TEST');
  return new_order;
end;
$$;

revoke execute on function public.admin_test_shop_order(jsonb) from public, anon;
grant execute on function public.admin_test_shop_order(jsonb) to authenticated;
