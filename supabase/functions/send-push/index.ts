// P7-03, P7-04, P7-06 — Notification push envoyée depuis le back-office.
//
// Appelée par le back-office avec la session du responsable : la fonction vérifie sa permission,
// relit l'élément dans la base (le texte de la notification n'est jamais fourni par l'appelant)
// et prévient les adhérents. Une notification n'est envoyée qu'une fois par élément.
//
// Corps : { "kind": "news" | "stage" | "cancellation" | "slot", "id": "<uuid>" }

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { serviceClient } from '../_shared/helloasso.ts';
import { sendPush, type PushMessage } from '../_shared/push.ts';

const PARIS = 'Europe/Paris';
const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

const permissions: Record<string, string[]> = {
  news: ['NEWS_CREATE', 'NEWS_UPDATE'],
  stage: ['STAGE_CREATE', 'STAGE_UPDATE'],
  cancellation: ['SCHEDULE_UPDATE'],
  slot: ['SCHEDULE_UPDATE'],
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** « 2026-10-12 » → « 12 oct. ». */
function shortDate(isoDate: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${isoDate}T00:00:00Z`)
  );
}

/** « 20:00:00 » → « 20h00 ». */
function hour(time: string) {
  return time.slice(0, 5).replace(':', 'h');
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405);
  const body = await request.json().catch(() => null);
  const kind = body?.kind as string;
  const id = String(body?.id ?? '');
  if (!permissions[kind] || !/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Demande invalide.' }, 400);

  // Droits du responsable, vérifiés par la base avec sa propre session.
  const user = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
  const { data: auth } = await user.auth.getUser();
  const checks = await Promise.all(permissions[kind].map((permission) => user.rpc('has_permission', { permission })));
  if (!auth.user || !checks.some((check) => check.data === true)) {
    return json({ error: "Vous n'avez pas le droit d'envoyer cette notification." }, 403);
  }

  const supabase = serviceClient();
  let message: PushMessage | null = null;

  if (kind === 'news') {
    const { data } = await supabase.from('news').select('id, title, published_at').eq('id', id).maybeSingle();
    if (data?.published_at) {
      message = { category: 'news', refId: data.id, title: '🏸 Nouvelle actualité', body: data.title, url: `/actualites/${data.id}` };
    }
  } else if (kind === 'stage') {
    const { data } = await supabase.from('stages').select('id, title, start_at, is_published').eq('id', id).maybeSingle();
    if (data?.is_published && data.start_at > new Date().toISOString()) {
      const date = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: PARIS }).format(new Date(data.start_at));
      message = {
        category: 'stages',
        refId: data.id,
        title: '🏸 Inscriptions ouvertes',
        body: `${data.title}, le ${date}. Les places sont limitées !`,
        url: `/stage/${data.id}`,
      };
    }
  } else if (kind === 'cancellation') {
    const { data } = await supabase
      .from('schedule_cancellations')
      .select('id, start_date, end_date, reason, schedules (title, weekday, start_time)')
      .eq('id', id)
      .maybeSingle();
    const slot = data?.schedules as { title: string; weekday: number; start_time: string } | null;
    if (data && slot) {
      const period =
        data.start_date === data.end_date
          ? `le ${shortDate(data.start_date)}`
          : `du ${shortDate(data.start_date)} au ${shortDate(data.end_date)}`;
      message = {
        category: 'schedule',
        refId: data.id,
        title: '🏸 Créneau annulé',
        body: `${slot.title} du ${WEEKDAYS[slot.weekday - 1]} ${hour(slot.start_time)} : annulé ${period}${data.reason ? ` (${data.reason})` : ''}.`,
        url: '/planning',
      };
    }
  } else if (kind === 'slot') {
    const { data } = await supabase
      .from('schedules')
      .select('id, title, date, start_time, is_cancelled, cancellation_reason')
      .eq('id', id)
      .maybeSingle();
    if (data?.is_cancelled && data.date) {
      message = {
        category: 'schedule',
        refId: data.id,
        title: '🏸 Créneau annulé',
        body: `${data.title} du ${shortDate(data.date)} à ${hour(data.start_time)} est annulé${data.cancellation_reason ? ` (${data.cancellation_reason})` : ''}.`,
        url: '/planning',
      };
    }
  }

  if (!message) return json({ error: 'Rien à annoncer : élément introuvable, non publié ou passé.' }, 400);

  try {
    const recipients = await sendPush(supabase, { ...message, sentBy: auth.user.id });
    return json(recipients === null ? { alreadySent: true } : { recipients });
  } catch (cause) {
    console.error(cause);
    return json({ error: "La notification n'a pas pu être envoyée." }, 500);
  }
});
