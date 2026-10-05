import { Barlow_600SemiBold } from '@expo-google-fonts/barlow';
import { Gelasio_400Regular, Gelasio_700Bold } from '@expo-google-fonts/gelasio';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { DesignSystemProvider } from '@/design-system';
import { AuthProvider, useAuth } from '@/features/auth/auth-provider';
import { hasClubAccess, useMembers } from '@/features/members/api';
import { queryClient } from '@/lib/query-client';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    Barlow_600SemiBold,
    Gelasio_400Regular,
    Gelasio_700Bold,
  });

  // Le splash reste affiché tant que les polices ne sont pas prêtes.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <DesignSystemProvider>
            <RootNavigator />
          </DesignSystemProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

/**
 * Aiguillage selon l'état de l'utilisateur :
 * - non connecté → connexion / inscription ;
 * - connecté sans aucune licence sur le compte (ou seulement des licences refusées)
 *   → saisie de sa licence ou de celle d'un enfant ;
 * - au moins une licence en attente ou validée (parent ou enfant) → l'application.
 *
 * Ce n'est qu'un confort d'affichage : les droits réels sont vérifiés par la base (RLS).
 */
function RootNavigator() {
  const { session, isLoading } = useAuth();
  const members = useMembers();
  const hasLicence = hasClubAccess(members.data);
  const isSignedIn = !!session;
  const ready = !isLoading && (!isSignedIn || !members.isPending);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={isSignedIn && !hasLicence}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={isSignedIn && hasLicence}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="actualites" />
        <Stack.Screen name="stage/[id]" />
        <Stack.Screen name="paiement" />
      </Stack.Protected>
    </Stack>
  );
}
