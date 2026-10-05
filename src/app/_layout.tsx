import { Barlow_600SemiBold } from '@expo-google-fonts/barlow';
import { Gelasio_400Regular, Gelasio_700Bold } from '@expo-google-fonts/gelasio';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { DesignSystemProvider } from '@/design-system';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
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
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <DesignSystemProvider>
        <AnimatedSplashOverlay />
        <AppTabs />
      </DesignSystemProvider>
    </ThemeProvider>
  );
}
