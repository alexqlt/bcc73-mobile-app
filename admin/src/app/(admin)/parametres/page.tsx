import { redirect } from "next/navigation";

import { Card, PageHeader } from "@/components/ui";
import { isAdmin } from "@/lib/auth";

export const metadata = { title: "Paramètres — BCC73 Administration" };

/** Paramètres généraux de l'application, réservés au rôle Administrateur (à compléter au besoin). */
export default async function ParametresPage() {
  if (!(await isAdmin())) redirect("/");

  return (
    <>
      <PageHeader eyebrow="Administration" title="Paramètres" />
      <Card className="max-w-3xl">
        <p className="text-muted">Aucun paramètre général pour le moment.</p>
      </Card>
    </>
  );
}
