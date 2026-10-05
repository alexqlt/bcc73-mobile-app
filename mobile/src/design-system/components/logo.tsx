import { Image } from 'expo-image';

import { useDesignSystem } from '../theme-context';

/** Proportions du logo (largeur / hauteur), d'après le SVG du site bcc73.com. */
const LOGO_RATIO = 752 / 568;

const sources = {
  // « BCC Chambéry » en noir, pour les fonds clairs.
  light: require('@/assets/images/logo.png'),
  // « BCC Chambéry » en blanc, pour les fonds sombres.
  dark: require('@/assets/images/logo-dark.png'),
  // Volant en blanc, pour les fonds jaunes (comme sur la page d'accueil du site).
  onAccent: require('@/assets/images/logo-on-yellow.png'),
};

export type LogoProps = {
  height?: number;
  /** `accent` : posé sur le jaune du club. Par défaut, suit le mode clair / sombre. */
  background?: 'default' | 'accent';
};

/** Logo du Badminton Club de Chambéry, adapté au fond sur lequel il est posé. */
export function Logo({ height = 96, background = 'default' }: LogoProps) {
  const { mode } = useDesignSystem();

  return (
    <Image
      source={background === 'accent' ? sources.onAccent : sources[mode]}
      style={{ height, width: height * LOGO_RATIO }}
      contentFit="contain"
      accessibilityRole="image"
      accessibilityLabel="Badminton Club de Chambéry"
    />
  );
}
