import { ActionForm } from "@/components/action-form";
import { Logo } from "@/components/logo";
import { Button, Card, Input, Label } from "@/components/ui";

import { signIn } from "./actions";

export const metadata = { title: "Connexion — BCC73 Administration" };

/** Même compte que dans l'application mobile. L'accès dépend ensuite des rôles attribués. */
export default function ConnexionPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card highlighted className="w-full max-w-md">
        <Logo height={110} />
        <h1 className="mt-4 text-3xl">Administration</h1>
        <div className="mt-2 h-1.5 w-12 -skew-x-[20deg] bg-accent" />
        <p className="mt-4 text-sm text-muted">
          Connectez-vous avec le compte que vous utilisez dans l&apos;application du club.
        </p>
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
