import type { ReactNode } from "react";

import { Badge } from "@/components/ui";
import { formatTime, scheduleTypeLabels, type ScheduleType } from "@/lib/planning";

/** Ligne de créneau : horaires, intitulé, type, lieu et étiquettes éventuelles. */
export function SlotLine({
  slot,
  cancelled,
  reason,
  children,
}: {
  slot: { start_time: string; end_time: string; type: ScheduleType; title: string; location: string | null };
  cancelled?: boolean;
  reason?: string | null;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <span className={`w-28 font-heading ${cancelled ? "line-through" : ""}`}>
        {formatTime(slot.start_time)} → {formatTime(slot.end_time)}
      </span>
      <span className={`font-bold ${cancelled ? "line-through" : ""}`}>{slot.title}</span>
      <Badge tone={slot.type === "training" ? "accent" : "neutral"}>{scheduleTypeLabels[slot.type]}</Badge>
      {slot.location && <span className="text-sm text-muted">{slot.location}</span>}
      {cancelled && <Badge tone="danger">Annulé</Badge>}
      {cancelled && reason && <span className="text-sm text-muted">{reason}</span>}
      {children}
    </div>
  );
}
