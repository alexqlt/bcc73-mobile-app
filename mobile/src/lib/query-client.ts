import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { addNetworkStateListener } from 'expo-network';
import { AppState, Platform } from 'react-native';

/**
 * Client TanStack Query partagé par toute l'application.
 * Les écrans n'utilisent jamais ce client directement : ils passent par les
 * hooks de `src/features/<domaine>/` (ex. `useNews()`).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes : planning, actualités et classements changent peu
      retry: 2,
    },
  },
});

if (Platform.OS !== 'web') {
  // Met les requêtes en pause hors connexion et les relance au retour du réseau.
  onlineManager.setEventListener((setOnline) => {
    const subscription = addNetworkStateListener((state) => {
      setOnline(state.isConnected ?? true);
    });
    return () => subscription.remove();
  });

  // Rafraîchit les données périmées quand l'app revient au premier plan.
  focusManager.setEventListener((setFocused) => {
    const subscription = AppState.addEventListener('change', (status) => {
      setFocused(status === 'active');
    });
    return () => subscription.remove();
  });
}
