import { useDS } from '@/design-system';

/** En-tête des écrans empilés au-dessus des onglets (actualités, stages, boutique…), aux couleurs du club. */
export function useStackHeaderOptions() {
  const { colors, fonts } = useDS();

  return {
    headerShown: true,
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.text,
    headerTitleStyle: { fontFamily: fonts.heading },
    headerShadowVisible: false,
    headerBackTitle: 'Retour',
    contentStyle: { backgroundColor: colors.background },
  };
}
