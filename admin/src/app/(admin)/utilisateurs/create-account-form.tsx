"use client";

import { useActionState, useState } from "react";

import { Button, Card, Input, Label } from "@/components/ui";

import { createAccount } from "./actions";

type Role = { id: string; name: string; is_system: boolean };

/** Création d'un compte avec ses rôles ; le mot de passe provisoire n'est affiché qu'une fois. */
export function CreateAccountForm({ roles, canGrantAdmin }: { roles: Role[]; canGrantAdmin: boolean }) {
  const [state, formAction, pending] = useActionState(createAccount, null);
  const [copied, setCopied] = useState(false);

  return (
    <Card className="mb-8">
      <h2 className="text-xl">Créer un compte</h2>
      <p className="mt-1 text-sm text-muted">
        Pour un bénévole ou un adhérent qui n&apos;a pas encore de compte. L&apos;adresse est considérée comme
        confirmée ; un mot de passe provisoire est généré, à lui transmettre. Il pourra le changer depuis
        l&apos;application (« Mot de passe oublié »).
      </p>

      {state?.created ? (
        <div className="mt-4 flex flex-col gap-3 border-l-4 border-accent bg-background p-4">
          <p>
            Compte créé pour <strong>{state.created.email}</strong>. Mot de passe provisoire, affiché une seule fois :
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <code className="bg-surface px-3 py-2 font-mono text-lg tracking-wider">{state.created.password}</code>
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(state.created!.password);
                setCopied(true);
              }}
            >
              {copied ? "Copié" : "Copier"}
            </Button>
          </div>
          <form action={formAction}>
            <input type="hidden" name="reset" value="1" />
            <button type="submit" className="cursor-pointer text-sm underline decoration-accent decoration-2 underline-offset-4">
              Créer un autre compte
            </button>
          </form>
        </div>
      ) : (
        <form action={formAction} className="mt-4 flex flex-col gap-4">
          <fieldset disabled={pending} className="contents">
            <div className="flex max-w-md flex-col gap-1">
              <Label htmlFor="new-email">Email</Label>
              <Input id="new-email" name="email" type="email" autoComplete="off" placeholder="prenom.nom@exemple.fr" required />
            </div>
            <fieldset className="flex flex-col gap-1">
              <legend className="mb-1 font-heading text-xs uppercase tracking-widest">Rôles (facultatif)</legend>
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                {roles
                  .filter((role) => canGrantAdmin || !role.is_system)
                  .map((role) => (
                    <label key={role.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="roleIds" value={role.id} className="accent-[var(--accent)]" />
                      {role.name}
                    </label>
                  ))}
              </div>
            </fieldset>
            <div>
              <Button type="submit" variant="accent">
                {pending ? "Création…" : "Créer le compte"}
              </Button>
            </div>
          </fieldset>
          {state?.error && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {state.error}
            </p>
          )}
        </form>
      )}
    </Card>
  );
}
