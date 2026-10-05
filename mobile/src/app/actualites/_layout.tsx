import { Stack } from 'expo-router';

import { useStackHeaderOptions } from '@/components/stack-header';

/** Pile des actualités (liste puis détail), ouverte depuis l'accueil, au-dessus des onglets. */
export default function NewsLayout() {
  const headerOptions = useStackHeaderOptions();

  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ title: 'Actualités' }} />
      <Stack.Screen name="[id]" options={{ title: 'Actualité' }} />
    </Stack>
  );
}
