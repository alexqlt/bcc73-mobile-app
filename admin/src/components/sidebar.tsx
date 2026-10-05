"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };

export function Sidebar({ items, email, signOut }: { items: NavItem[]; email: string; signOut: () => Promise<void> }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col gap-6 bg-primary p-6 text-on-primary md:min-h-screen md:w-64">
      <Link href="/" className="font-heading text-2xl uppercase">
        BCC<span className="ml-1 bg-accent px-2 text-on-accent">73</span>
      </Link>
      <nav className="flex flex-row flex-wrap gap-1 md:flex-col">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 font-heading text-sm uppercase tracking-wider transition ${
                active ? "bg-accent text-on-accent" : "hover:bg-on-primary/10"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-2 text-sm">
        <span className="truncate opacity-70">{email}</span>
        <form action={signOut}>
          <button type="submit" className="cursor-pointer font-heading text-xs uppercase tracking-wider underline decoration-accent decoration-2 underline-offset-4">
            Se déconnecter
          </button>
        </form>
      </div>
    </aside>
  );
}
