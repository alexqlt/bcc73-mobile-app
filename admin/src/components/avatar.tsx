import Image from "next/image";

import { avatarUrl } from "@/lib/images";

/** Photo de profil ronde entourée de jaune (ou initiales sur fond jaune), comme dans l'app mobile. */
export function Avatar({ path, initials, size = 48 }: { path: string | null; initials: string; size?: number }) {
  const url = avatarUrl(path);
  return (
    <div
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-accent bg-accent font-heading text-on-accent"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {url ? <Image src={url} alt="" fill unoptimized className="object-cover" /> : <span aria-hidden>{initials}</span>}
    </div>
  );
}
