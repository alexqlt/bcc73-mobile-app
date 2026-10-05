// P7-02 — Envoi des notifications push par Expo Push Service.
//
// Doc : https://docs.expo.dev/push-notifications/sending-notifications/
// Secret facultatif : EXPO_ACCESS_TOKEN (si la « sécurité renforcée » des push est activée sur expo.dev).

import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export type NotificationCategory = 'news' | 'stages' | 'schedule' | 'payments';

export type PushMessage = {
  category: NotificationCategory;
  /** Élément à l'origine de l'envoi : une notification n'est envoyée qu'une fois par élément. */
  refId: string;
  title: string;
  body: string;
  /** Écran de l'app ouvert au toucher (ex. /actualites/<id>). */
  url?: string;
  /** Comptes destinataires ; tous les comptes si absent. */
  accountIds?: string[];
  sentBy?: string | null;
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH = 100;

/**
 * Envoie la notification aux appareils des comptes qui ne l'ont pas désactivée, puis la note au
 * journal. Renvoie le nombre d'appareils visés, ou null si elle avait déjà été envoyée.
 */
export async function sendPush(supabase: SupabaseClient, message: PushMessage): Promise<number | null> {
  // Le journal (unique par catégorie et élément) sert de verrou contre les doubles envois.
  const { data: logged, error: logError } = await supabase
    .from('notification_log')
    .insert({
      category: message.category,
      ref_id: message.refId,
      title: message.title,
      body: message.body,
      url: message.url ?? null,
      sent_by: message.sentBy ?? null,
    })
    .select('id')
    .single();
  if (logError?.code === '23505') return null;
  if (logError) throw logError;

  let query = supabase.from('push_tokens').select('token, account_id');
  if (message.accountIds) query = query.in('account_id', message.accountIds);
  const { data: tokens, error } = await query;
  if (error) throw error;

  // Comptes qui ont désactivé cette catégorie (sans ligne de préférences : tout est activé).
  const { data: optedOut, error: prefError } = await supabase
    .from('notification_preferences')
    .select('account_id')
    .eq(message.category, false);
  if (prefError) throw prefError;
  const excluded = new Set(optedOut.map((row) => row.account_id));
  const recipients = tokens.filter((row) => !excluded.has(row.account_id)).map((row) => row.token);

  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const unregistered: string[] = [];
  for (let start = 0; start < recipients.length; start += BATCH) {
    const batch = recipients.slice(start, start + BATCH);
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(
        batch.map((to) => ({
          to,
          title: message.title,
          body: message.body,
          data: message.url ? { url: message.url } : {},
          sound: 'default',
          channelId: 'default',
          priority: 'high',
        }))
      ),
    });
    if (!response.ok) {
      console.error(`Expo Push : ${response.status} ${await response.text()}`);
      continue;
    }
    const { data: tickets } = await response.json();
    (tickets as { status: string; details?: { error?: string } }[]).forEach((ticket, index) => {
      // Appareil désinstallé ou notifications révoquées : on cesse de lui écrire.
      if (ticket.details?.error === 'DeviceNotRegistered') unregistered.push(batch[index]);
      else if (ticket.status === 'error') console.error('Expo Push : ticket en erreur', ticket);
    });
  }
  if (unregistered.length > 0) {
    await supabase.from('push_tokens').delete().in('token', unregistered);
  }

  await supabase.from('notification_log').update({ recipients: recipients.length }).eq('id', logged.id);
  return recipients.length;
}
