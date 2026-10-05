import { signOut } from "@/app/connexion/actions";
import { Sidebar, type NavItem } from "@/components/sidebar";
import { Card } from "@/components/ui";
import { getViewer, NEWS_PERMISSIONS, SCHEDULE_PERMISSIONS, type Permission } from "@/lib/auth";

const navigation: (NavItem & { permissions?: Permission[] })[] = [
  { href: "/", label: "Tableau de bord" },
  { href: "/actualites", label: "Actualités", permissions: NEWS_PERMISSIONS },
  { href: "/planning", label: "Planning", permissions: SCHEDULE_PERMISSIONS },
  { href: "/adherents", label: "Adhérents", permissions: ["MEMBER_VIEW"] },
  { href: "/utilisateurs", label: "Utilisateurs", permissions: ["USER_MANAGE"] },
  { href: "/roles", label: "Rôles", permissions: ["ROLE_MANAGE"] },
  { href: "/journal", label: "Journal", permissions: ["USER_MANAGE", "ROLE_MANAGE"] },
];

export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();

  // Un adhérent sans rôle peut se connecter mais n'a rien à faire ici.
  if (viewer.permissions.size === 0) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <Card highlighted className="w-full max-w-md">
          <h1 className="text-2xl">Accès réservé</h1>
          <p className="mt-4 text-muted">
            Votre compte ({viewer.email}) n&apos;a aucun rôle dans le back-office. Demandez à un administrateur du club
            de vous en attribuer un.
          </p>
          <form action={signOut} className="mt-6">
            <button type="submit" className="cursor-pointer underline decoration-accent decoration-2 underline-offset-4">
              Se déconnecter
            </button>
          </form>
        </Card>
      </main>
    );
  }

  const items = navigation.filter(
    (item) => !item.permissions || item.permissions.some((permission) => viewer.permissions.has(permission))
  );

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <Sidebar items={items} email={viewer.email} signOut={signOut} />
      <main className="flex-1 p-6 md:p-10">{children}</main>
    </div>
  );
}
