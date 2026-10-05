"use client";

import type { ComponentProps } from "react";

import { Button } from "@/components/ui";

/** Bouton d'envoi qui demande confirmation avant une action irréversible (suppression…). */
export function ConfirmButton({ message, ...props }: ComponentProps<typeof Button> & { message: string }) {
  return (
    <Button
      type="submit"
      onClick={(event) => {
        if (!confirm(message)) event.preventDefault();
      }}
      {...props}
    />
  );
}
