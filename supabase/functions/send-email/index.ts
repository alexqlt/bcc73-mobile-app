// P7-10 — Emails déclenchés par l'app ou le back-office (les emails de paiement partent de la
// confirmation HelloAsso, voir _shared/helloasso.ts).
//
// Corps : { "kind": "welcome" }                         → l'adhérent connecté, après confirmation de son email
//         { "kind": "member_approved", "id": "<membre>" } → après validation d'une licence (MEMBER_MANAGE)
// Le contenu est toujours rédigé ici, à partir de la base : l'appelant ne fournit qu'un identifiant.

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { sendEmail } from '../_shared/email.ts';
import { serviceClient } from '../_shared/helloasso.ts';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405);
  const body = await request.json().catch(() => null);

  const user = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
  const { data: auth } = await user.auth.getUser();
  if (!auth.user) return json({ error: 'Connexion requise.' }, 401);
  const supabase = serviceClient();

  try {
    if (body?.kind === 'welcome') {
      // Uniquement pour soi-même, et une fois l'adresse confirmée.
      if (!auth.user.email || !auth.user.email_confirmed_at) return json({ sent: false });
      const sent = await sendEmail(supabase, {
        kind: 'welcome',
        refId: auth.user.id,
        to: auth.user.email,
        subject: 'Bienvenue dans l’application du BCC73',
        heading: 'Bienvenue au club !',
        paragraphs: [
          'Votre compte est créé. Vous y retrouvez les actualités, le planning des créneaux, les stages et la boutique de volants du club.',
          'Si vous avez indiqué une licence (la vôtre ou celle d’un enfant), un responsable va la vérifier : nous vous prévenons par email dès qu’elle est validée.',
        ],
      });
      return json({ sent });
    }

    if (body?.kind === 'member_approved') {
      const { data: allowed } = await user.rpc('has_permission', { permission: 'MEMBER_MANAGE' });
      if (allowed !== true) return json({ error: "Vous n'avez pas le droit d'envoyer cet email." }, 403);

      const { data: member } = await supabase
        .from('members')
        .select('id, account_id, first_name, last_name, license_number, is_account_holder, status')
        .eq('id', String(body.id ?? ''))
        .maybeSingle();
      if (!member || member.status !== 'approved') return json({ error: 'Licence introuvable ou non validée.' }, 400);
      const { data: account } = await supabase.auth.admin.getUserById(member.account_id);
      if (!account.user?.email) return json({ sent: false });

      const who = member.is_account_holder ? 'Votre licence' : `La licence de ${member.first_name}`;
      const sent = await sendEmail(supabase, {
        kind: 'member_approved',
        refId: member.id,
        to: account.user.email,
        subject: `${who} est validée`,
        heading: 'Licence validée !',
        paragraphs: [
          `${who} a été vérifiée par le club. Les stages et la boutique de volants sont maintenant ouverts dans l’application.`,
        ],
        details: [`${member.first_name} ${member.last_name}`, `Licence ${member.license_number}`],
      });
      return json({ sent });
    }

    return json({ error: 'Demande invalide.' }, 400);
  } catch (cause) {
    console.error(cause);
    return json({ error: "L'email n'a pas pu être envoyé." }, 500);
  }
});
