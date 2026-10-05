// Client HelloAsso (API v5) et réconciliation des commandes, partagés par les Edge Functions.
//
// Secrets (supabase secrets set …) :
//   HELLOASSO_CLIENT_ID, HELLOASSO_CLIENT_SECRET  identifiants API (back-office HelloAsso)
//   HELLOASSO_ORGANIZATION_SLUG                   slug de l'association (URL helloasso.com/associations/<slug>)
//   HELLOASSO_API_URL                             https://api.helloasso-sandbox.com (tests) ou https://api.helloasso.com
//
// Doc : https://dev.helloasso.com/docs/intégrer-le-paiement-sur-votre-site
//       https://dev.helloasso.com/docs/validation-de-vos-paiements

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

import { euros, sendEmail } from './email.ts';

export class PaymentNotConfiguredError extends Error {}

type Config = { apiUrl: string; clientId: string; clientSecret: string; organizationSlug: string };

function config(): Config {
  const apiUrl = Deno.env.get('HELLOASSO_API_URL');
  const clientId = Deno.env.get('HELLOASSO_CLIENT_ID');
  const clientSecret = Deno.env.get('HELLOASSO_CLIENT_SECRET');
  const organizationSlug = Deno.env.get('HELLOASSO_ORGANIZATION_SLUG');
  if (!apiUrl || !clientId || !clientSecret || !organizationSlug) {
    throw new PaymentNotConfiguredError("Le paiement en ligne n'est pas encore configuré.");
  }
  return { apiUrl: apiUrl.replace(/\/$/, ''), clientId, clientSecret, organizationSlug };
}

// Jeton d'accès (30 minutes), gardé tant que l'instance de la fonction vit.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(cfg: Config) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const response = await fetch(`${cfg.apiUrl}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
    }),
  });
  if (!response.ok) throw new Error(`HelloAsso : authentification refusée (${response.status})`);
  const body = await response.json();
  cachedToken = { value: body.access_token, expiresAt: Date.now() + Number(body.expires_in ?? 1800) * 1000 };
  return cachedToken.value;
}

async function helloAsso<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cfg = config();
  const response = await fetch(`${cfg.apiUrl}/v5/organizations/${cfg.organizationSlug}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${await accessToken(cfg)}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`HelloAsso ${path} : ${response.status} ${await response.text()}`);
  }
  return response.json();
}

export type CheckoutIntent = {
  id: number;
  redirectUrl: string;
  metadata?: Record<string, unknown>;
  /** Présent seulement quand le paiement a abouti. */
  order?: { id: number };
};

export function createCheckoutIntent(body: {
  totalAmount: number;
  itemName: string;
  backUrl: string;
  errorUrl: string;
  returnUrl: string;
  payer?: { email?: string };
  metadata: Record<string, string>;
}) {
  return helloAsso<CheckoutIntent>('/checkout-intents', {
    method: 'POST',
    body: JSON.stringify({ ...body, initialAmount: body.totalAmount, containsDonation: false }),
  });
}

export function getCheckoutIntent(id: string) {
  return helloAsso<CheckoutIntent>(`/checkout-intents/${encodeURIComponent(id)}`);
}

/** Client Supabase avec la clé de service (contourne la RLS) : réservé au serveur. */
export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
}

export type SyncResult = 'paid' | 'pending' | 'cancelled' | 'unknown';

/**
 * Met une commande à jour d'après HelloAsso, seule source de vérité : elle n'est « payée » que si
 * l'intention de paiement contient une commande HelloAsso et porte bien notre identifiant.
 * Le contenu d'un webhook ou d'une URL de retour n'est jamais cru tel quel.
 */
export async function syncOrder(
  supabase: SupabaseClient,
  orderId: string,
  options: { cancelIfUnpaid?: boolean } = {}
): Promise<SyncResult> {
  const { data: order } = await supabase
    .from('orders')
    .select('id, status, provider_checkout_id')
    .eq('id', orderId)
    .maybeSingle();
  if (!order) return 'unknown';
  if (order.status === 'paid') return 'paid';
  if (!order.provider_checkout_id) return order.status;

  const intent = await getCheckoutIntent(order.provider_checkout_id);
  if (String(intent.metadata?.order_id ?? '') !== order.id) {
    console.error(`Intention ${intent.id} : order_id inattendu`, intent.metadata);
    return 'unknown';
  }
  if (intent.order?.id) {
    const { data: justConfirmed, error } = await supabase.rpc('confirm_order_payment', {
      order_id: order.id,
      provider_order: String(intent.order.id),
    });
    if (error) throw error;
    if (justConfirmed) await emailPayment(supabase, order.id);
    return 'paid';
  }
  if (options.cancelIfUnpaid && order.status === 'pending') {
    const { error } = await supabase.rpc('cancel_pending_order', { order_id: order.id });
    if (error) throw error;
    return 'cancelled';
  }
  return order.status;
}

/** P7-10 : email « paiement reçu » (boutique) ou « inscription confirmée » (stage), une seule fois. */
async function emailPayment(supabase: SupabaseClient, orderId: string) {
  try {
    const { data: order } = await supabase
      .from('orders')
      .select(
        `id, type, total_cents, payer_name, payer_email, order_items (label, quantity),
         stage_registrations (member_name, price_name, days, stages (title, kind, start_at, end_at, location))`
      )
      .eq('id', orderId)
      .single();
    if (!order?.payer_email) return;

    if (order.type === 'stage') {
      const registrations = order.stage_registrations as {
        member_name: string;
        price_name: string;
        days: string[];
        stages: { title: string; kind: string; start_at: string; end_at: string; location: string | null } | null;
      }[];
      const stage = registrations[0]?.stages;
      if (!stage) return;
      const day = (iso: string) =>
        new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
          new Date(`${iso}T00:00:00Z`)
        );
      const names = registrations.map((registration) => registration.member_name);
      await sendEmail(supabase, {
        kind: 'stage_registration',
        refId: order.id,
        to: order.payer_email,
        toName: order.payer_name,
        subject: `Inscription confirmée : ${stage.title}`,
        heading: 'Inscription confirmée !',
        paragraphs: [
          `Nous avons bien reçu le paiement : ${names.join(', ')} ${names.length > 1 ? 'sont inscrits' : 'est inscrit(e)'} à l’événement « ${stage.title} ».`,
          'Retrouvez vos inscriptions dans l’onglet Boutique de l’application du club.',
        ],
        details: [
          `Événement : ${stage.title}`,
          `${stage.kind === 'meal' ? 'Date' : 'Jour(s)'} : ${registrations[0].days.map(day).join(', ')}`,
          ...(stage.location ? [`Lieu : ${stage.location}`] : []),
          // Chaque participant a son tarif (repas : adulte / enfant).
          ...registrations.map((registration) => `${registration.member_name} : ${registration.price_name}`),
          `Total payé : ${euros(order.total_cents)}`,
        ],
      });
    } else {
      await sendEmail(supabase, {
        kind: 'payment_received',
        refId: order.id,
        to: order.payer_email,
        toName: order.payer_name,
        subject: 'Paiement reçu – boutique du BCC73',
        heading: 'Merci pour votre achat !',
        paragraphs: [
          'Nous avons bien reçu votre paiement. Vos articles sont à récupérer au club, lors d’un créneau.',
          'Le détail de vos achats est dans l’application, onglet Plus > Mes achats.',
        ],
        details: [
          ...order.order_items.map((item: { label: string; quantity: number }) => `${item.quantity} × ${item.label}`),
          `Total payé : ${euros(order.total_cents)}`,
        ],
      });
    }
  } catch (cause) {
    console.error('Email de paiement non envoyé', cause);
  }
}

