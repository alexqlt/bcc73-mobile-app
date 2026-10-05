import { ActionForm } from "@/components/action-form";
import { Logo } from "@/components/logo";
import { Button, Card, Input, Label } from "@/components/ui";
import { ACCOUNT_DISABLED_MESSAGE } from "@/lib/action-state";

import { signIn } from "./actions";

export const metadata = { title: "Connexion — BCC73 Administration" };

/** Même compte que dans l'application mobile. L'accès dépend ensuite des rôles attribués. */
export default async function ConnexionPage({ searchParams }: PageProps<"/connexion">) {
  const disabled = (await searchParams).desactive === "1";
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card highlighted className="w-full max-w-md">
        <Logo height={110} />
        <h1 className="mt-4 text-3xl">Administration</h1>
        <div className="mt-2 h-1.5 w-12 -skew-x-[20deg] bg-accent" />
        <p className="mt-4 text-sm text-muted">
          Connectez-vous avec le compte que vous utilisez dans l&apos;application du club.
        </p>
        {disabled && (
          <p role="alert" className="mt-4 border-l-4 border-red-700 bg-red-700/10 p-3 text-sm">
            {ACCOUNT_DISABLED_MESSAGE}
          </p>
        )}
        <ActionForm action={signIn} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <Button type="submit">Se connecter</Button>
        </ActionForm>
      </Card>
    </main>
  );
}
