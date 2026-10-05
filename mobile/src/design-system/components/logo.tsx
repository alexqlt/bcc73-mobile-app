import { Image } from 'expo-image';

import { useDesignSystem } from '../theme-context';

/** Proportions du logo (largeur / hauteur), d'après le SVG du site bcc73.com. */
const LOGO_RATIO = 752 / 568;

const sources = {
  // « BCC Chambéry » en noir, pour les fonds clairs.
  light: require('@/assets/images/logo.png'),
  // « BCC Chambéry » en blanc, pour les fonds sombres.
  dark: require('@/assets/images/logo-dark.png'),
};

/** Logo du Badminton Club de Chambéry, adapté au mode clair / sombre. */
export function Logo({ height = 96 }: { height?: number }) {
  const { mode } = useDesignSystem();

  return (
    <Image
      source={sources[mode]}
      style={{ height, width: height * LOGO_RATIO }}
      contentFit="contain"
      accessibilityRole="image"
      accessibilityLabel="Badminton Club de Chambéry"
    />
  );
}
