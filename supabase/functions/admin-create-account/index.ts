// Back-office > Utilisateurs : création d'un compte par un responsable (permission USER_MANAGE).
//
// Le compte est créé avec son adresse déjà confirmée et un mot de passe provisoire, renvoyé une seule
// fois au responsable pour qu'il le transmette ; la personne peut ensuite le changer depuis l'app
// (« Mot de passe oublié »). Les rôles sont attribués avec la session du responsable : la RLS
// d'account_roles s'applique (seul un administrateur donne le rôle Administrateur). En cas d'échec,
// le compte créé est supprimé.
//
// Corps : { "email": "…", "roleIds": ["<uuid>", …] }

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { serviceClient } from '../_shared/helloasso.ts';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Mot de passe provisoire lisible (sans 0/O, 1/l/I) : 14 caractères aléatoires. */
function temporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405);
  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? '').trim().toLowerCase();
  const roleIds: string[] = Array.isArray(body?.roleIds) ? body.roleIds.map(String) : [];

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Adresse email invalide.' }, 400);
  if (roleIds.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) return json({ error: 'Rôle invalide.' }, 400);

  const user = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
  const { data: auth } = await user.auth.getUser();
  const { data: allowed } = await user.rpc('has_permission', { permission: 'USER_MANAGE' });
  if (!auth.user || allowed !== true) {
    return json({ error: "Vous n'avez pas le droit de créer un compte." }, 403);
  }

  // Le rôle Administrateur ne peut être donné que par un administrateur : vérifié avant de créer le compte.
  if (roleIds.length > 0) {
    const [{ data: roles }, { data: isAdmin }] = await Promise.all([
      user.from('roles').select('id, is_system').in('id', roleIds),
      user.rpc('is_admin'),
    ]);
    if (!roles || roles.length !== new Set(roleIds).size) return json({ error: 'Rôle inconnu.' }, 400);
    if (roles.some((role) => role.is_system) && isAdmin !== true) {
      return json({ error: 'Seul un administrateur peut attribuer le rôle Administrateur.' }, 403);
    }
  }

  const service = serviceClient();
  const password = temporaryPassword();
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    const exists = createError?.code === 'email_exists' || /already/i.test(createError?.message ?? '');
    return json({ error: exists ? 'Un compte existe déjà avec cette adresse email.' : 'Le compte n’a pas pu être créé.' }, 400);
  }
  const accountId = created.user.id;

  if (roleIds.length > 0) {
    const { error: rolesError } = await user
      .from('account_roles')
      .insert([...new Set(roleIds)].map((roleId) => ({ account_id: accountId, role_id: roleId })));
    if (rolesError) {
      await service.auth.admin.deleteUser(accountId);
      return json({ error: 'Les rôles n’ont pas pu être attribués : le compte n’a pas été créé.' }, 403);
    }
  }

  await service.from('audit_logs').insert({
    actor_id: auth.user.id,
    action: 'create_account',
    target_type: 'accounts',
    target_id: accountId,
    details: { email, role_ids: roleIds },
  });

  return json({ accountId, email, password });
});
