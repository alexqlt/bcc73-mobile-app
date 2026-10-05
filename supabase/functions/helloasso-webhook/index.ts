// P6-04 — Notifications HelloAsso (webhook) : source fiable des paiements.
//
// URL à déclarer dans le back-office HelloAsso (Mon compte > Intégrations et API > Notifications) :
//   https://<ref>.supabase.co/functions/v1/helloasso-webhook
//
// Les notifications HelloAsso ne sont pas signées : leur contenu n'est pas cru. Seul l'identifiant
// de commande (metadata.order_id, que nous avons transmis) sert à relire l'intention de paiement
// auprès de l'API HelloAsso, qui confirme ou non le paiement (syncOrder).
// Déployée sans vérification de JWT : c'est HelloAsso qui l'appelle.

import { serviceClient, syncOrder } from '../_shared/helloasso.ts';

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Méthode non autorisée', { status: 405 });

  const body = await request.json().catch(() => null);
  const orderId = String(body?.metadata?.order_id ?? '');
  // Notifications sans commande de l'app (dons, autres formulaires…) : ignorées.
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return new Response('ignored', { status: 200 });

  try {
    const status = await syncOrder(serviceClient(), orderId);
    return new Response(status, { status: 200 });
  } catch (cause) {
    console.error(cause);
    // Erreur : HelloAsso renverra la notification plus tard.
    return new Response('error', { status: 500 });
  }
});
