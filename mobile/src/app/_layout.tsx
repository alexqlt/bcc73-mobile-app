import { Barlow_600SemiBold } from '@expo-google-fonts/barlow';
import { Gelasio_400Regular, Gelasio_700Bold } from '@expo-google-fonts/gelasio';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { DesignSystemProvider } from '@/design-system';
import { queryClient } from '@/lib/query-client';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    Barlow_600SemiBold,
    Gelasio_400Regular,
    Gelasio_700Bold,
  });
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  // Le splash reste affiché tant que les polices ne sont pas prêtes.
  if (!ready) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <DesignSystemProvider>
          <AppTabs />
        </DesignSystemProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
