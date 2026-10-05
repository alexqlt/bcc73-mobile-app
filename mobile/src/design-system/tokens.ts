/**
 * Design tokens BCC73 — style « Club », fidèle à la DA de https://bcc73.com/ :
 * jaune club #FFDB06, noir #0D0D0D, gris #F7F7F7, coins carrés,
 * titres en Barlow majuscules, texte courant en Gelasio, biseaux jaunes.
 */

export type Mode = 'light' | 'dark';

export type ColorTokens = {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  onAccent: string;
  accentSoft: string;
  primary: string;
  onPrimary: string;
  alertBackground: string;
  alertText: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
};

export type FontTokens = {
  heading: string;
  body: string;
  bodyStrong: string;
  label: string;
};

export type RadiusTokens = {
  sm: number;
  md: number;
  lg: number;
  pill: number;
};

export type DesignTokens = {
  colors: ColorTokens;
  fonts: FontTokens;
  radii: RadiusTokens;
};

export const Palette = {
  yellow: '#FFDB06',
  black: '#0D0D0D',
  white: '#FFFFFF',
  grey: '#F7F7F7',
  green: '#355A35',
} as const;

const ThemeColors: Record<Mode, ColorTokens> = {
  light: {
    background: Palette.white,
    surface: Palette.grey,
    surfaceAlt: '#EDEDED',
    border: '#E0E0E0',
    text: Palette.black,
    textMuted: '#5C5C5C',
    accent: Palette.yellow,
    onAccent: Palette.black,
    accentSoft: '#FFF6C2',
    primary: Palette.black,
    onPrimary: Palette.white,
    alertBackground: Palette.black,
    alertText: Palette.white,
    success: '#2F6B34',
    successSoft: '#E3F1E4',
    warning: '#8A5A00',
    warningSoft: '#FFF3C4',
    danger: '#B42318',
    dangerSoft: '#FDE4E1',
  },
  dark: {
    background: Palette.black,
    surface: '#1A1A1A',
    surfaceAlt: '#262626',
    border: '#2E2E2E',
    text: Palette.white,
    textMuted: '#A3A3A3',
    accent: Palette.yellow,
    onAccent: Palette.black,
    accentSoft: '#3A3205',
    primary: Palette.white,
    onPrimary: Palette.black,
    alertBackground: Palette.yellow,
    alertText: Palette.black,
    success: '#7BD389',
    successSoft: '#1D3320',
    warning: '#FFDB06',
    warningSoft: '#3A3205',
    danger: '#FF8A7A',
    dangerSoft: '#3D1A16',
  },
};

/** Noms des polices tels que chargés par `useFonts` dans `src/app/_layout.tsx`. */
export const FontFamily = {
  barlowSemiBold: 'Barlow_600SemiBold',
  gelasio: 'Gelasio_400Regular',
  gelasioBold: 'Gelasio_700Bold',
} as const;

const ThemeFonts: FontTokens = {
  heading: FontFamily.barlowSemiBold,
  body: FontFamily.gelasio,
  bodyStrong: FontFamily.gelasioBold,
  label: FontFamily.barlowSemiBold,
};

/** Coins carrés, comme sur le site. Conservés en tokens pour pouvoir évoluer. */
const ThemeRadii: RadiusTokens = { sm: 0, md: 0, lg: 0, pill: 0 };

export function getTokens(mode: Mode): DesignTokens {
  return { colors: ThemeColors[mode], fonts: ThemeFonts, radii: ThemeRadii };
}

export const Space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;
