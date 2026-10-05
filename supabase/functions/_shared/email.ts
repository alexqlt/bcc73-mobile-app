// P7-09 — Emails transactionnels par l'API Brevo (les ports SMTP 25 et 587 sont fermés dans les
// Edge Functions). Même habillage que les emails d'authentification (supabase/templates/).
//
// Secrets : BREVO_API_KEY (Brevo > SMTP & API > Clés API, commence par xkeysib-),
//           EMAIL_SENDER facultatif (info@bcc73.com par défaut, doit être un expéditeur validé dans Brevo).
// Doc : https://developers.brevo.com/reference/sendtransacemail

import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export type EmailKind = 'welcome' | 'member_approved' | 'payment_received' | 'stage_registration';

export type Email = {
  kind: EmailKind;
  /** Élément à l'origine de l'envoi : un email n'est envoyé qu'une fois par élément. */
  refId: string;
  to: string;
  toName?: string | null;
  subject: string;
  /** Titre affiché en tête de l'email. */
  heading: string;
  /** Paragraphes du message (texte simple, échappé). */
  paragraphs: string[];
  /** Lignes de détail (ex. « Montant : 35,00 € »), affichées dans un encadré. */
  details?: string[];
};

const LOGO_URL = 'https://img.mailinblue.com/5202987/images/content_library/original/6540cc26ed81845819687579.png';

function escape(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function html(email: Email) {
  const paragraphs = email.paragraphs
    .map(
      (paragraph) =>
        `<tr><td style="padding: 8px 25px; font-family: verdana, geneva, sans-serif; font-size: 16px; line-height: 1.5; color: #4d5156; text-align: center;">${escape(paragraph)}</td></tr>`
    )
    .join('');
  const details = email.details?.length
    ? `<tr><td align="center" style="padding: 20px 15px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 440px; background-color: #fff6c2; border-left: 6px solid #ffdb06;"><tr><td style="padding: 16px 20px; font-family: verdana, geneva, sans-serif; font-size: 15px; line-height: 1.7; color: #000000;">${email.details.map(escape).join('<br />')}</td></tr></table></td></tr>`
    : '';

  return `<!DOCTYPE html><html lang="fr"><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${escape(email.subject)}</title></head>
<body bgcolor="#ffffff" style="background-color: #ffffff; margin: 0; padding: 0;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-collapse: collapse;">
<tr><td align="center" style="background-color: #000000; padding: 35px 15px;"><a href="https://bcc73.com/" target="_blank"><img src="${LOGO_URL}" width="142" alt="BCC73" style="display: block; width: 142px; margin: 0 auto; border: 0;" /></a></td></tr>
<tr><td align="center"><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 600px;">
<tr><td align="center" style="padding: 35px 15px 15px; font-family: 'trebuchet ms', helvetica, sans-serif, Arial; font-size: 28px; font-weight: bold; color: #000000;">${escape(email.heading)}</td></tr>
${paragraphs}${details}
<tr><td style="padding: 25px 25px 35px; font-family: verdana, geneva, sans-serif; font-size: 13px; line-height: 1.5; color: #8a8d91; text-align: center;">Badminton Club de Chambéry · <a href="https://bcc73.com/" style="color: #8a8d91;">bcc73.com</a></td></tr>
</table></td></tr></table></body></html>`;
}

function text(email: Email) {
  return [email.heading, '', ...email.paragraphs, '', ...(email.details ?? []), '', 'Badminton Club de Chambéry — bcc73.com'].join('\n');
}

/**
 * Envoie l'email s'il ne l'a pas déjà été (journal email_log). Renvoie false s'il avait déjà été
 * envoyé ou si Brevo n'est pas configuré ; une erreur d'envoi libère le journal pour un nouvel essai.
 */
export async function sendEmail(supabase: SupabaseClient, email: Email): Promise<boolean> {
  const apiKey = Deno.env.get('BREVO_API_KEY');
  if (!apiKey) {
    console.warn(`Email ${email.kind} non envoyé : BREVO_API_KEY absent`);
    return false;
  }

  const { data: logged, error } = await supabase
    .from('email_log')
    .insert({ kind: email.kind, ref_id: email.refId, to_email: email.to, subject: email.subject })
    .select('id')
    .single();
  if (error?.code === '23505') return false;
  if (error) throw error;

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'BCC73', email: Deno.env.get('EMAIL_SENDER') ?? 'info@bcc73.com' },
      to: [{ email: email.to, ...(email.toName ? { name: email.toName } : {}) }],
      subject: email.subject,
      htmlContent: html(email),
      textContent: text(email),
      tags: [email.kind],
    }),
  });
  if (!response.ok) {
    await supabase.from('email_log').delete().eq('id', logged.id);
    throw new Error(`Brevo : ${response.status} ${await response.text()}`);
  }
  const { messageId } = await response.json();
  await supabase.from('email_log').update({ provider_message_id: messageId ?? null }).eq('id', logged.id);
  return true;
}

/** 2550 → « 25,50 € ». */
export function euros(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}
