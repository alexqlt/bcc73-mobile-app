import { ActionForm } from "@/components/action-form";
import { Badge, Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { createRole, deleteRole, saveRolePermissions, updateRole } from "./actions";

export const metadata = { title: "Rôles — BCC73 Administration" };

/** Domaines affichés pour regrouper les permissions (préfixe du code). */
const domains: Record<string, string> = {
  NEWS: "Actualités",
  SCHEDULE: "Planning",
  STAGE: "Événements",
  VOLANT: "Boutique",
  MEMBER: "Adhérents",
  PAYMENT: "Paiements",
  USER: "Utilisateurs",
  ROLE: "Rôles",
};

/** P2-09 : créer un rôle et choisir ses permissions. */
export default async function RolesPage() {
  await requirePermission("ROLE_MANAGE");
  const supabase = await createClient();

  const [{ data: roles, error: rolesError }, { data: permissions, error: permissionsError }] = await Promise.all([
    supabase
      .from("roles")
      .select("id, name, description, is_system, role_permissions (permission_code)")
      .order("is_system", { ascending: false })
      .order("name"),
    supabase.from("permissions").select("code, description").order("code"),
  ]);
  if (rolesError) throw rolesError;
  if (permissionsError) throw permissionsError;

  const groups = Object.entries(domains)
    .map(([prefix, label]) => ({ label, permissions: permissions.filter((p) => p.code.split("_")[0] === prefix) }))
    .filter((group) => group.permissions.length > 0);

  return (
    <>
      <PageHeader eyebrow="Accès" title="Rôles" />

      <Card className="mb-8">
        <h2 className="text-xl">Nouveau rôle</h2>
        <ActionForm action={createRole} className="mt-4 flex flex-wrap items-end gap-4">
          <div className="flex min-w-48 flex-1 flex-col gap-1">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" name="name" placeholder="Ex. Responsable planning" maxLength={60} required />
          </div>
          <div className="flex min-w-48 flex-[2] flex-col gap-1">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" placeholder="À quoi sert ce rôle ?" />
          </div>
          <Button type="submit">Créer</Button>
        </ActionForm>
      </Card>

      <div className="flex flex-col gap-6">
        {roles.map((role) => {
          const granted = new Set(role.role_permissions.map((row) => row.permission_code));
          return (
            <Card key={role.id} highlighted={role.is_system}>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl">{role.name}</h2>
                {role.is_system && <Badge tone="accent">Toutes les permissions</Badge>}
              </div>
              {role.description && <p className="mt-1 text-sm text-muted">{role.description}</p>}

              {role.is_system ? (
                <p className="mt-4 text-sm text-muted">
                  Le rôle Administrateur ne peut être ni modifié ni supprimé.
                </p>
              ) : (
                <>
                  <ActionForm action={updateRole} className="mt-4 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="roleId" value={role.id} />
                    <div className="flex min-w-48 flex-1 flex-col gap-1">
                      <Label htmlFor={`name-${role.id}`}>Nom</Label>
                      <Input id={`name-${role.id}`} name="name" defaultValue={role.name} maxLength={60} required />
                    </div>
                    <div className="flex min-w-48 flex-[2] flex-col gap-1">
                      <Label htmlFor={`description-${role.id}`}>Description</Label>
                      <Input
                        id={`description-${role.id}`}
                        name="description"
                        defaultValue={role.description ?? ""}
                        placeholder="À quoi sert ce rôle ?"
                      />
                    </div>
                    <Button type="submit" variant="secondary">
                      Renommer
                    </Button>
                  </ActionForm>
                  <ActionForm action={saveRolePermissions} className="mt-4 flex flex-col gap-4">
                    <input type="hidden" name="roleId" value={role.id} />
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      {groups.map((group) => (
                        <fieldset key={group.label} className="flex flex-col gap-1">
                          <legend className="mb-1 font-heading text-xs uppercase tracking-widest text-muted">
                            {group.label}
                          </legend>
                          {group.permissions.map((permission) => (
                            <label key={permission.code} className="flex items-start gap-2 text-sm">
                              <input
                                type="checkbox"
                                name="permissions"
                                value={permission.code}
                                defaultChecked={granted.has(permission.code)}
                                className="mt-1 accent-[var(--accent)]"
                              />
                              {permission.description}
                            </label>
                          ))}
                        </fieldset>
                      ))}
                    </div>
                    <div>
                      <Button type="submit">Enregistrer les permissions</Button>
                    </div>
                  </ActionForm>
                  <ActionForm action={deleteRole} className="mt-4 flex flex-wrap gap-2">
                    <input type="hidden" name="roleId" value={role.id} />
                    <Button type="submit" variant="danger">
                      Supprimer le rôle
                    </Button>
                  </ActionForm>
                </>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
