import { Stack } from 'expo-router';

import { useDS } from '@/design-system';

/** Pile des actualités (liste puis détail), ouverte depuis l'accueil, au-dessus des onglets. */
export default function NewsLayout() {
  const { colors, fonts } = useDS();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.heading },
        headerShadowVisible: false,
        headerBackTitle: 'Retour',
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="index" options={{ title: 'Actualités' }} />
      <Stack.Screen name="[id]" options={{ title: 'Actualité' }} />
    </Stack>
  );
}
