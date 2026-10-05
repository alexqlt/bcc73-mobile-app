// Back-office > Utilisateurs : suppression complète d'un compte (administrateurs uniquement).
//
// Supprime l'utilisateur Supabase Auth, ce qui supprime en cascade son compte, ses membres, leurs
// inscriptions aux événements et ses rôles. Les commandes payées restent (comptabilité du club),
// sans compte rattaché. La photo de profil est retirée du bucket « avatars ».
//
// Corps : { "accountId": "<uuid>" }

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { serviceClient } from '../_shared/helloasso.ts';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405);
  const body = await request.json().catch(() => null);
  const accountId = String(body?.accountId ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(accountId)) return json({ error: 'Compte invalide.' }, 400);

  const user = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
  const { data: auth } = await user.auth.getUser();
  const { data: isAdmin } = await user.rpc('is_admin');
  if (!auth.user || isAdmin !== true) {
    return json({ error: 'Seul un administrateur peut supprimer un compte.' }, 403);
  }
  if (auth.user.id === accountId) return json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' }, 400);

  const service = serviceClient();
  const { data: target } = await service.auth.admin.getUserById(accountId);
  if (!target?.user) return json({ error: "Ce compte n'existe plus." }, 404);

  const [{ data: holder }, { data: avatars }] = await Promise.all([
    service
      .from('members')
      .select('first_name, last_name')
      .eq('account_id', accountId)
      .eq('is_account_holder', true)
      .neq('status', 'rejected')
      .maybeSingle(),
    service.storage.from('avatars').list(accountId),
  ]);

  const { error: deleteError } = await service.auth.admin.deleteUser(accountId);
  if (deleteError) return json({ error: "Le compte n'a pas pu être supprimé." }, 500);

  // Au mieux : une photo orpheline ne gêne rien.
  if (avatars?.length) {
    await service.storage.from('avatars').remove(avatars.map((file) => `${accountId}/${file.name}`));
  }

  await service.from('audit_logs').insert({
    actor_id: auth.user.id,
    action: 'delete_account',
    target_type: 'accounts',
    target_id: accountId,
    details: { person: holder ? `${holder.first_name} ${holder.last_name}` : target.user.email },
  });

  return json({ deleted: true });
});
