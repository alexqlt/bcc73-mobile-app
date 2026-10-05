import { ActionForm } from "@/components/action-form";
import { Avatar } from "@/components/avatar";
import { Badge, Button, formatDate, PageHeader } from "@/components/ui";
import { isAdmin, requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { grantRole, revokeRole } from "./actions";
import { CreateAccountForm } from "./create-account-form";

export const metadata = { title: "Utilisateurs — BCC73 Administration" };

/** P2-08 et P2-10 : comptes de connexion et attribution des rôles. */
export default async function UtilisateursPage() {
  await requirePermission("USER_MANAGE");
  const supabase = await createClient();

  const [{ data: users, error: usersError }, { data: roles, error: rolesError }] = await Promise.all([
    supabase.rpc("admin_list_users"),
    supabase.from("roles").select("id, name, is_system").order("is_system", { ascending: false }).order("name"),
  ]);
  if (usersError) throw usersError;
  if (rolesError) throw rolesError;

  const roleById = new Map(roles.map((role) => [role.id, role]));

  return (
    <>
      <PageHeader eyebrow="Accès" title="Utilisateurs" />
      <CreateAccountForm roles={roles} canGrantAdmin={await isAdmin()} />
      <p className="mb-6 max-w-2xl text-muted">
        Chaque adhérent qui crée un compte dans l&apos;application apparaît ici. Attribuez un rôle aux bénévoles qui
        doivent accéder au back-office : ils se connectent avec le même email et le même mot de passe.
      </p>
      <ul className="flex flex-col gap-3">
        {users.map((user) => {
          const availableRoles = roles.filter((role) => !user.role_ids.includes(role.id));
          return (
            <li key={user.id} className="flex flex-col gap-4 bg-surface p-5 lg:flex-row lg:items-center">
              <Avatar path={user.avatar_path} initials={user.email.charAt(0).toUpperCase()} />
              <div className="flex-1">
                <p className="font-bold">{user.email}</p>
                <p className="text-sm text-muted">
                  Inscrit le {formatDate(user.created_at)} · dernière connexion {formatDate(user.last_sign_in_at)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {user.role_ids.length === 0 && <span className="text-sm text-muted">Aucun rôle</span>}
                  {user.role_ids.map((roleId) => {
                    const role = roleById.get(roleId);
                    return (
                      <ActionForm key={roleId} action={revokeRole} className="flex items-center gap-1">
                        <input type="hidden" name="accountId" value={user.id} />
                        <input type="hidden" name="roleId" value={roleId} />
                        <Badge tone={role?.is_system ? "accent" : "neutral"}>{role?.name ?? "Rôle inconnu"}</Badge>
                        <button
                          type="submit"
                          aria-label={`Retirer le rôle ${role?.name}`}
                          className="cursor-pointer px-1 text-muted hover:text-red-700"
                        >
                          ✕
                        </button>
                      </ActionForm>
                    );
                  })}
                </div>
              </div>
              {availableRoles.length > 0 && (
                <ActionForm action={grantRole} className="flex flex-wrap gap-2 lg:w-[24rem]">
                  <input type="hidden" name="accountId" value={user.id} />
                  <select
                    name="roleId"
                    aria-label="Rôle à attribuer"
                    defaultValue=""
                    className="min-w-0 flex-1 border-[1.5px] border-border bg-background px-3 py-2"
                  >
                    <option value="" disabled>
                      Choisir un rôle…
                    </option>
                    {availableRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  <Button type="submit">Attribuer</Button>
                </ActionForm>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
