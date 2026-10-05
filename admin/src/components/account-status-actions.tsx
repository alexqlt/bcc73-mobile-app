import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { Button } from "@/components/ui";
import type { ActionState } from "@/lib/action-state";
import type { Database } from "@/lib/database.types";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;
type AccountStatus = Database["public"]["Enums"]["account_status"];

/**
 * Accès d'un compte : archiver, bloquer, réactiver et (si `remove` est fourni) supprimer.
 * Sans `canRestrict`, seule la réactivation d'un compte archivé est proposée (responsable des licences).
 */
export function AccountStatusActions({
  accountId,
  status,
  setStatus,
  remove,
  canRestrict = true,
}: {
  accountId: string;
  status: AccountStatus;
  setStatus: Action;
  remove?: Action;
  canRestrict?: boolean;
}) {
  const statusForm = (next: AccountStatus, children: React.ReactNode) => (
    <ActionForm action={setStatus}>
      <input type="hidden" name="accountId" value={accountId} />
      <input type="hidden" name="status" value={next} />
      {children}
    </ActionForm>
  );

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "active" &&
        (canRestrict || status === "archived") &&
        statusForm(
          "active",
          <Button type="submit" variant="secondary" className="py-1">
            Réactiver
          </Button>
        )}
      {canRestrict &&
        status === "active" &&
        statusForm(
          "archived",
          <ConfirmButton variant="secondary" className="py-1" message="Archiver ce compte ? La personne ne pourra plus se connecter.">
            Archiver
          </ConfirmButton>
        )}
      {canRestrict &&
        status !== "blocked" &&
        statusForm(
          "blocked",
          <ConfirmButton variant="secondary" className="py-1" message="Bloquer ce compte ? La personne n'aura plus accès à rien.">
            Bloquer
          </ConfirmButton>
        )}
      {remove && (
        <ActionForm action={remove}>
          <input type="hidden" name="accountId" value={accountId} />
          <ConfirmButton
            variant="danger"
            className="py-1"
            message="Supprimer définitivement ce compte, ses membres et leurs inscriptions ? Cette action est irréversible."
          >
            Supprimer
          </ConfirmButton>
        </ActionForm>
      )}
    </div>
  );
}
