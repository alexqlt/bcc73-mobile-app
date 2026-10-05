import type { Permission } from "@/lib/auth";
import type { Tables } from "@/lib/database.types";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;
export type AuditLog = Tables<"audit_logs">;

/** Catégories d'événements du journal (filtre), avec les tables concernées et le libellé de chaque action. */
/**
 * Catégories d'événements du journal : tables concernées, permissions qui donnent accès (même
 * correspondance que la fonction SQL readable_audit_targets, seule à faire foi) et libellés.
 */
export const eventCategories: {
  value: string;
  label: string;
  targetTypes: string[];
  permissions: Permission[];
  events: Record<string, string>;
}[] = [
  {
    value: "licences",
    label: "Licences",
    targetTypes: ["members"],
    permissions: ["MEMBER_VIEW", "MEMBER_MANAGE"],
    events: {
      "signup:members": "a créé son compte",
      "approve:members": "a validé une licence",
      "reject:members": "a refusé une licence",
    },
  },
  {
    value: "roles",
    label: "Rôles et accès",
    targetTypes: ["roles", "role_permissions", "account_roles", "accounts"],
    permissions: ["USER_MANAGE", "ROLE_MANAGE"],
    events: {
      "create_account:accounts": "a créé un compte",
      "archive:accounts": "a archivé un compte",
      "block:accounts": "a bloqué un compte",
      "reactivate:accounts": "a réactivé un compte",
      "delete_account:accounts": "a supprimé un compte",
      "insert:roles": "a créé un rôle",
      "update:roles": "a modifié un rôle",
      "delete:roles": "a supprimé un rôle",
      "insert:role_permissions": "a ajouté une permission à un rôle",
      "delete:role_permissions": "a retiré une permission d'un rôle",
      "insert:account_roles": "a attribué un rôle",
      "delete:account_roles": "a retiré un rôle",
    },
  },
  {
    value: "actualites",
    label: "Actualités",
    targetTypes: ["news"],
    permissions: ["NEWS_CREATE", "NEWS_UPDATE", "NEWS_DELETE"],
    events: {
      "insert:news": "a créé une actualité",
      "update:news": "a modifié une actualité",
      "delete:news": "a supprimé une actualité",
    },
  },
  {
    value: "planning",
    label: "Planning",
    targetTypes: ["schedule_periods", "schedules", "schedule_cancellations"],
    permissions: ["SCHEDULE_CREATE", "SCHEDULE_UPDATE", "SCHEDULE_DELETE"],
    events: {
      "insert:schedule_periods": "a créé une période du planning",
      "update:schedule_periods": "a modifié une période du planning",
      "delete:schedule_periods": "a supprimé une période du planning",
      "insert:schedules": "a ajouté un créneau",
      "update:schedules": "a modifié un créneau",
      "delete:schedules": "a supprimé un créneau",
      "insert:schedule_cancellations": "a annulé un créneau",
      "delete:schedule_cancellations": "a rétabli un créneau",
    },
  },
  {
    value: "boutique-stages",
    label: "Boutique et événements",
    targetTypes: ["products", "stages", "stage_prices", "event_default_prices"],
    permissions: ["VOLANT_MANAGE", "VOLANT_VIEW_SALES", "STAGE_CREATE", "STAGE_UPDATE", "STAGE_DELETE", "STAGE_VIEW_REGISTRATIONS"],
    events: {
      "insert:products": "a ajouté un article à la boutique",
      "update:products": "a modifié un article de la boutique",
      "delete:products": "a supprimé un article de la boutique",
      "insert:stages": "a créé un événement",
      "update:stages": "a modifié un événement",
      "delete:stages": "a supprimé un événement",
      "insert:stage_prices": "a ajouté un tarif d'événement",
      "update:stage_prices": "a modifié un tarif d'événement",
      "delete:stage_prices": "a supprimé un tarif d'événement",
      "update:event_default_prices": "a modifié les tarifs par défaut des événements",
    },
  },
  {
    value: "journal",
    label: "Journal",
    targetTypes: ["audit_logs"],
    permissions: ["USER_MANAGE", "ROLE_MANAGE"],
    events: {
      "clear:audit_logs": "a vidé le journal",
    },
  },
];

const eventLabels: Record<string, string> = Object.assign({}, ...eventCategories.map((category) => category.events));

/** Catégories que le lecteur peut consulter, d'après ses permissions. */
export function readableCategories(permissions: Set<Permission>) {
  return eventCategories.filter((category) => category.permissions.some((permission) => permissions.has(permission)));
}

/** Filtre `?categorie=…` → la catégorie choisie, ou null si absente ou inconnue. */
export function parseCategory(value: unknown) {
  return eventCategories.find((category) => category.value === value) ?? null;
}

/** Champs techniques masqués dans le détail des changements. */
const HIDDEN_FIELDS = new Set([
  "id",
  "created_at",
  "updated_at",
  "updated_by",
  "author_id",
  "granted_by",
  "granted_at",
  "stage_id",
  "period_id",
  "schedule_id",
  "order_id",
  "is_system",
  "position",
]);

/** Nom lisible de chaque champ (les autres gardent leur nom technique). */
const FIELD_LABELS: Record<string, string> = {
  name: "Nom",
  title: "Titre",
  description: "Description",
  content: "Contenu",
  image_path: "Photo",
  published_at: "Publication",
  archived_at: "Archivage",
  kind: "Type",
  location: "Lieu",
  start_at: "Début",
  end_at: "Fin",
  capacity: "Places",
  is_published: "Publié",
  day: "Jour",
  amount_cents: "Montant",
  price_cents: "Prix",
  active: "Visible dans l'app",
  start_date: "Du",
  end_date: "Au",
  date: "Date",
  weekday: "Jour de la semaine",
  start_time: "Début",
  end_time: "Fin",
  type: "Type",
  is_cancelled: "Annulé",
  cancellation_reason: "Motif d'annulation",
  reason: "Motif",
  meal_adult_cents: "Tarif adulte (repas)",
  meal_child_cents: "Tarif enfant (repas)",
  stage_day_cents: "Tarif un jour (stage)",
  stage_all_days_cents: "Tarif tous les jours (stage)",
  role_id: "Rôle",
  permission_code: "Permission",
  account_id: "Compte",
  status: "Statut",
  rejection_reason: "Motif du refus",
  license_number: "Licence",
};

const WEEKDAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const ENUM_LABELS: Record<string, string> = {
  stage: "Stage",
  meal: "Repas du club",
  normal: "Planning normal",
  holidays: "Vacances",
  free_play: "Jeu libre",
  training: "Entraînement",
  other: "Autre",
  pending: "En attente",
  approved: "Validée",
  rejected: "Refusée",
};

/** Archivage (« archive ») ou désarchivage (« unarchive ») d'une actualité ou d'un événement, sinon null. */
function archiveChange(log: AuditLog) {
  if (log.action !== "update" || (log.target_type !== "news" && log.target_type !== "stages")) return null;
  const row = (log.details as { new?: Record<string, unknown>; old?: Record<string, unknown> }) ?? {};
  const before = row.old?.archived_at ?? null;
  const after = row.new?.archived_at ?? null;
  if (!before && after) return "archive";
  if (before && !after) return "unarchive";
  return null;
}

export type FieldChange = { field: string; before: string; after: string };

/**
 * Contexte pour rendre une ligne lisible : prénom et nom des personnes citées (auteurs et comptes
 * concernés, l'email seulement pour un compte sans membre), noms des rôles et des permissions.
 */
export async function loadJournalContext(supabase: Supabase) {
  const [{ data: roles }, { data: permissions }, { data: people }, { data: stages }, { data: schedules }] = await Promise.all([
    supabase.from("roles").select("id, name"),
    supabase.from("permissions").select("code, description"),
    supabase.rpc("journal_people"),
    supabase.from("stages").select("id, title"),
    supabase.from("schedules").select("id, title"),
  ]);
  const nameById = new Map((people ?? []).map((person) => [person.id, person.display_name]));
  const roleNameById = new Map((roles ?? []).map((role) => [role.id, role.name]));
  const permissionById = new Map((permissions ?? []).map((p) => [p.code, p.description]));
  const stageTitleById = new Map((stages ?? []).map((stage) => [stage.id, stage.title]));
  const scheduleTitleById = new Map((schedules ?? []).map((schedule) => [schedule.id, schedule.title]));

  /** Valeur lisible d'un champ : euros, oui / non, dates, noms des rôles et des comptes… */
  const formatValue = (field: string, value: unknown): string => {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "boolean") return value ? "Oui" : "Non";
    if (field.endsWith("_cents") && typeof value === "number") {
      return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value / 100);
    }
    if (field === "weekday" && typeof value === "number") return WEEKDAYS[value - 1] ?? String(value);
    if (field === "role_id") return roleNameById.get(String(value)) ?? "Rôle supprimé";
    if (field === "permission_code") return permissionById.get(String(value)) ?? String(value);
    if (field === "account_id") return nameById.get(String(value)) ?? "un utilisateur";
    if (field === "image_path") return "photo";
    const text = String(value);
    if (ENUM_LABELS[text]) return ENUM_LABELS[text];
    if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
      return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(text));
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${text}T12:00:00Z`));
    }
    if (/^\d{2}:\d{2}:\d{2}$/.test(text)) return text.slice(0, 5);
    return text.length > 200 ? `${text.slice(0, 200)}…` : text;
  };

  return {
    /**
     * Changements d'une ligne : champs modifiés (ancienne → nouvelle valeur), ou valeurs créées /
     * supprimées. Le journal n'enregistre pas les champs vides : un champ absent vaut « — ».
     */
    changes(log: AuditLog): FieldChange[] {
      const row = (log.details as { new?: Record<string, unknown>; old?: Record<string, unknown> }) ?? {};
      // Validation / refus d'une licence : seulement le membre concerné et sa licence.
      if (log.target_type === "members" && (log.action === "approve" || log.action === "reject")) {
        const licence = log.details as { member?: string; license_number?: string };
        return [
          licence.member && { field: "Membre", before: "", after: licence.member },
          licence.license_number && { field: "Licence", before: "", after: licence.license_number },
        ].filter((change): change is FieldChange => !!change);
      }
      // Archivage / désarchivage : la ligne se suffit à elle-même.
      if ((!row.new && !row.old) || archiveChange(log)) return [];
      const fields = [...new Set([...Object.keys(row.old ?? {}), ...Object.keys(row.new ?? {})])].filter(
        (field) => !HIDDEN_FIELDS.has(field)
      );
      return fields
        .filter((field) => JSON.stringify(row.old?.[field] ?? null) !== JSON.stringify(row.new?.[field] ?? null))
        .map((field) => ({
          field: FIELD_LABELS[field] ?? field,
          before: row.old ? formatValue(field, row.old[field]) : "",
          after: row.new ? formatValue(field, row.new[field]) : "",
        }));
    },
    /** Auteur de l'action. */
    actor(log: AuditLog) {
      return log.actor_id ? (nameById.get(log.actor_id) ?? "Un responsable") : "Supabase (SQL)";
    },
    /** Libellé de l'action. */
    action(log: AuditLog) {
      // Archivage / désarchivage d'une actualité ou d'un événement : une modification de archived_at.
      const archive = archiveChange(log);
      if (archive) {
        const what = log.target_type === "news" ? "une actualité" : "un événement";
        return `${archive === "archive" ? "a archivé" : "a désarchivé"} ${what}`;
      }
      return eventLabels[`${log.action}:${log.target_type}`] ?? `${log.action} ${log.target_type}`;
    },
    /** Détail lisible de l'élément concerné, à partir de la ligne enregistrée. */
    describe(log: AuditLog) {
      const row =
        (log.details as {
          new?: Record<string, string>;
          old?: Record<string, string>;
          reason?: string;
          deleted?: number;
          member?: string;
          license_number?: string;
          person?: string;
        }) ?? {};
      const data = row.new ?? row.old ?? {};
      // Tarif d'un événement : seulement le nom de l'événement (le détail est dans les changements).
      if (log.target_type === "stage_prices") return (data.stage_id && stageTitleById.get(data.stage_id)) || "Événement supprimé";
      // Annulation d'un créneau (ou rétablissement) : le créneau et la période d'annulation.
      if (log.target_type === "schedule_cancellations") {
        const title = (data.schedule_id && scheduleTitleById.get(data.schedule_id)) || "Créneau supprimé";
        // Les annulations d'avant les intervalles n'ont qu'une date.
        const start = data.start_date ?? data.date;
        const end = data.end_date ?? start;
        const period = start === end ? `le ${formatValue("date", start)}` : `du ${formatValue("date", start)} au ${formatValue("date", end)}`;
        return `${title} · ${period}`;
      }
      const parts = [
        // Compte créé, archivé, bloqué, réactivé ou supprimé : la personne (nom gardé dans la ligne).
        log.target_type === "accounts" && log.target_id && (nameById.get(log.target_id) ?? row.person ?? "un utilisateur"),
        // Licence validée ou refusée : le membre concerné.
        row.member,
        row.member && row.license_number,
        data.name,
        data.title,
        data.date,
        data.start_date && (data.start_date === data.end_date ? data.start_date : `${data.start_date} → ${data.end_date}`),
        data.role_id && roleNameById.get(data.role_id),
        data.permission_code && (permissionById.get(data.permission_code) ?? data.permission_code),
        data.account_id && (nameById.get(data.account_id) ?? "un utilisateur"),
        row.reason && `motif : ${row.reason}`,
        row.deleted !== undefined && `${row.deleted} entrée(s) effacée(s)`,
      ];
      return parts.filter(Boolean).join(" · ");
    },
  };
}
