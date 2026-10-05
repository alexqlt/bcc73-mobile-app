import { redirect } from "next/navigation";

import { ActionForm } from "@/components/action-form";
import { Badge, Button, Card, formatDate, PageHeader } from "@/components/ui";
import { isAdmin } from "@/lib/auth";
import { getAppSettings } from "@/lib/settings";

import { setPushNotifications } from "./actions";

export const metadata = { title: "Paramètres — BCC73 Administration" };

/** Paramètres généraux de l'application, réservés au rôle Administrateur. */
export default async function ParametresPage() {
  if (!(await isAdmin())) redirect("/");
  const settings = await getAppSettings();

  return (
    <>
      <PageHeader eyebrow="Administration" title="Paramètres" />

      <Card className="max-w-3xl" highlighted={settings.pushEnabled}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl">Notifications push</h2>
          {settings.pushEnabled ? <Badge tone="success">Activées</Badge> : <Badge>Désactivées</Badge>}
        </div>
        <p className="mt-3 text-sm text-muted">
          Activées, l&apos;application demande l&apos;autorisation aux adhérents et le back-office propose
          « Envoyer une notification » (actualités, stages, créneaux annulés) ; les paiements confirmés sont
          annoncés automatiquement.
        </p>
        <p className="mt-2 text-sm text-muted">
          À n&apos;activer qu&apos;une fois l&apos;application installée depuis une build (EAS) : dans Expo Go, les
          notifications ne fonctionnent pas sur Android. Désactivées, rien n&apos;est envoyé.
        </p>
        <ActionForm action={setPushNotifications} className="mt-4 flex flex-wrap items-center gap-4">
          <input type="hidden" name="enabled" value={String(!settings.pushEnabled)} />
          <Button type="submit" variant={settings.pushEnabled ? "secondary" : "accent"}>
            {settings.pushEnabled ? "Désactiver les notifications" : "Activer les notifications"}
          </Button>
          {settings.updatedAt && <span className="text-xs text-muted">Modifié le {formatDate(settings.updatedAt)}</span>}
        </ActionForm>
      </Card>
    </>
  );
}
