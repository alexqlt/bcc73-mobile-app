// Retour du navigateur après le paiement HelloAsso (returnUrl, backUrl, errorUrl).
//
// L'URL de retour n'est pas une preuve de paiement : la commande est vérifiée auprès de HelloAsso
// (syncOrder) puis l'utilisateur est renvoyé dans l'app (lien bcc73://…, ou exp://… en développement).
// Déployée sans vérification de JWT : c'est HelloAsso qui redirige le navigateur ici.

import { serviceClient, syncOrder, type SyncResult } from '../_shared/helloasso.ts';

/** Liens de retour acceptés : l'app uniquement (pas de redirection ouverte vers un autre site). */
const APP_SCHEMES = ['bcc73://', 'exp://', 'exps://'];

const messages: Record<SyncResult, string> = {
  paid: 'Paiement confirmé, merci !',
  pending: 'Paiement en cours de confirmation par HelloAsso.',
  cancelled: 'Paiement annulé : rien n’a été débité.',
  unknown: 'Commande introuvable.',
};

function page(message: string) {
  return new Response(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BCC73</title></head><body style="font-family:sans-serif;padding:2rem;text-align:center">
<p>${message}</p><p>Vous pouvez revenir dans l’application du club.</p></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

Deno.serve(async (request) => {
  const url = new URL(request.url);
  const orderId = url.searchParams.get('order') ?? '';
  const result = url.searchParams.get('result');
  const to = url.searchParams.get('to');

  let status: SyncResult = 'unknown';
  if (/^[0-9a-f-]{36}$/i.test(orderId)) {
    try {
      // « Modifier le panier » ou erreur : la commande non payée est annulée (et sa place libérée).
      status = await syncOrder(serviceClient(), orderId, { cancelIfUnpaid: result === 'back' || result === 'error' });
    } catch (cause) {
      console.error(cause);
      status = 'pending';
    }
  }

  if (to && APP_SCHEMES.some((scheme) => to.startsWith(scheme))) {
    const target = new URL(to);
    target.searchParams.set('order', orderId);
    target.searchParams.set('status', status);
    return Response.redirect(target.toString(), 302);
  }
  return page(messages[status]);
});
