import Image from "next/image";

/** Proportions du logo (largeur / hauteur), d'après le SVG du site bcc73.com. */
const LOGO_RATIO = 752 / 568;

type LogoProps = {
  height: number;
  /**
   * Le fond est inversé par rapport à la page (ex. menu latéral : noir en mode clair, blanc en mode
   * sombre). On affiche alors la version opposée du logo.
   */
  inverted?: boolean;
  className?: string;
};

/** Logo du Badminton Club de Chambéry : version claire (texte noir) ou sombre (texte blanc). */
export function Logo({ height, inverted = false, className = "" }: LogoProps) {
  const width = Math.round(height * LOGO_RATIO);
  const [lightModeSrc, darkModeSrc] = inverted ? ["/logo-dark.svg", "/logo.svg"] : ["/logo.svg", "/logo-dark.svg"];

  return (
    <span className={className}>
      <Image src={lightModeSrc} alt="Badminton Club de Chambéry" width={width} height={height} className="block dark:hidden" unoptimized priority />
      <Image src={darkModeSrc} alt="Badminton Club de Chambéry" width={width} height={height} className="hidden dark:block" unoptimized priority />
    </span>
  );
}
