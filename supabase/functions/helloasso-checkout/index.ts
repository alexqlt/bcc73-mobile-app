// P6-03 — Création d'un paiement HelloAsso (Checkout), appelée par l'app avec la session de l'utilisateur.
//
// 1. La commande est créée par la base (create_shop_order / create_event_registrations) : elle
//    vérifie les droits, la licence, les places et calcule le montant.
// 2. Une intention de paiement HelloAsso est créée pour ce montant, avec l'id de la commande en
//    métadonnée.
// 3. L'app ouvre `redirectUrl` ; le paiement est confirmé plus tard par helloasso-return / -webhook.
//
// Corps : { "kind": "shop", "items": [{ "product_id", "quantity" }], "returnTo": "bcc73://paiement" }
//      ou { "kind": "stage", "stageId", "entries": [{ "memberId", "priceId" }], "returnTo": "…" } (un tarif par participant)

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { createCheckoutIntent, PaymentNotConfiguredError, serviceClient } from '../_shared/helloasso.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405);

  const body = await request.json().catch(() => null);
  if (!body || (body.kind !== 'shop' && body.kind !== 'stage')) {
    return json({ error: 'Demande invalide.' }, 400);
  }

  // Client « utilisateur » : la base applique ses droits (RLS, fonctions) comme dans l'app.
  const user = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
  const created =
    body.kind === 'shop'
      ? await user.rpc('create_shop_order', { items: body.items ?? [] })
      : await user.rpc('create_event_registrations', {
          stage: body.stageId,
          entries: (Array.isArray(body.entries) ? body.entries : []).map(
            (entry: { memberId?: string; priceId?: string }) => ({ member_id: entry.memberId, price_id: entry.priceId })
          ),
        });
  if (created.error) {
    // Messages métier (P0001) déjà rédigés en français par la base.
    const message = created.error.code === 'P0001' ? created.error.message : 'La commande n’a pas pu être créée.';
    return json({ error: message }, created.error.code === 'P0001' ? 400 : 403);
  }
  const orderId = created.data as string;

  const service = serviceClient();
  const { data: order, error } = await service
    .from('orders')
    .select('id, type, total_cents, payer_email, order_items (label, quantity)')
    .eq('id', orderId)
    .single();
  if (error) return json({ error: 'Commande introuvable.' }, 500);

  const back = new URL(`${Deno.env.get('SUPABASE_URL')}/functions/v1/helloasso-return`);
  back.searchParams.set('order', orderId);
  if (typeof body.returnTo === 'string') back.searchParams.set('to', body.returnTo);
  const withResult = (result: string) => {
    const url = new URL(back);
    url.searchParams.set('result', result);
    return url.toString();
  };

  const itemName = order.order_items
    .map((item: { label: string; quantity: number }) => (item.quantity > 1 ? `${item.quantity} × ${item.label}` : item.label))
    .join(', ')
    .slice(0, 250);

  try {
    const intent = await createCheckoutIntent({
      totalAmount: order.total_cents,
      itemName: itemName || 'BCC73',
      returnUrl: withResult('return'),
      backUrl: withResult('back'),
      errorUrl: withResult('error'),
      payer: order.payer_email ? { email: order.payer_email } : undefined,
      metadata: { order_id: orderId },
    });
    await service.from('orders').update({ provider_checkout_id: String(intent.id) }).eq('id', orderId);
    return json({ orderId, redirectUrl: intent.redirectUrl });
  } catch (cause) {
    // Sans paiement possible, la commande (et la place réservée) est libérée tout de suite.
    await service.rpc('cancel_pending_order', { order_id: orderId });
    if (cause instanceof PaymentNotConfiguredError) return json({ error: cause.message }, 503);
    console.error(cause);
    return json({ error: 'Le service de paiement ne répond pas. Réessayez dans quelques instants.' }, 502);
  }
});
