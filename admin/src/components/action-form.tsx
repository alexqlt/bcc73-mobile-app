"use client";

import { useActionState, type ReactNode } from "react";

import type { ActionState } from "@/lib/action-state";

type ActionFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
};

/** Formulaire relié à une Server Action : désactivé pendant l'envoi, affiche l'erreur éventuelle. */
export function ActionForm({ action, children, className }: ActionFormProps) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className={className}>
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {state?.error && (
        <p role="alert" className="basis-full text-sm text-red-700 dark:text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}
