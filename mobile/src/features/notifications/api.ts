import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/features/auth/auth-provider';
import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type NotificationPreferences = Pick<Tables<'notification_preferences'>, 'news' | 'stages' | 'schedule' | 'payments'>;

export const preferenceLabels: Record<keyof NotificationPreferences, { title: string; description: string }> = {
  news: { title: 'Actualités', description: 'Nouvelle actualité publiée par le club' },
  stages: { title: 'Stages', description: 'Ouverture des inscriptions à un stage' },
  schedule: { title: 'Planning', description: 'Créneau annulé (gymnase fermé, compétition…)' },
  payments: { title: 'Paiements', description: 'Paiement reçu, inscription à un stage confirmée' },
};

const DEFAULT_PREFERENCES: NotificationPreferences = { news: true, stages: true, schedule: true, payments: true };

// Notification reçue app ouverte : affichée en bannière, comme app fermée.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Les push ne fonctionnent pas sur le web, sur simulateur, ni dans Expo Go sur Android (depuis le
 * SDK 53) : il faut une build de l'app.
 */
export const pushSupportedOnDevice =
  Platform.OS !== 'web' &&
  Device.isDevice &&
  !(Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient);

/** Paramètres généraux du club : les notifications restent coupées tant que l'administrateur ne les a pas activées. */
export function useAppSettings() {
  return useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('push_notifications_enabled').maybeSingle();
      if (error) throw error;
      return { pushEnabled: data?.push_notifications_enabled ?? false };
    },
  });
}

/** Jeton de cet appareil, gardé pour le retirer à la déconnexion. */
let currentToken: string | null = null;

/**
 * P7-01 : demande l'autorisation, récupère le jeton Expo de l'appareil et le rattache au compte.
 * Sans effet là où les push ne fonctionnent pas (voir pushSupportedOnDevice).
 */
export async function registerForPushNotifications() {
  if (!pushSupportedOnDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Notifications du club',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const { error } = await supabase.rpc('register_push_token', {
    push_token: token,
    device_platform: Platform.OS,
  });
  if (error) throw error;
  currentToken = token;
  return token;
}

/** Retire l'appareil du compte (avant la déconnexion), pour qu'il ne reçoive plus ses notifications. */
export async function unregisterPushToken() {
  if (!currentToken) return;
  await supabase.from('push_tokens').delete().eq('token', currentToken);
  currentToken = null;
}

/**
 * Enregistre l'appareil une fois l'adhérent connecté, si l'administrateur a activé les notifications
 * (back-office > Paramètres) : sinon, l'autorisation n'est même pas demandée.
 */
export function usePushRegistration(signedIn: boolean) {
  const settings = useAppSettings();
  const enabled = signedIn && settings.data?.pushEnabled === true;

  useEffect(() => {
    if (!enabled) return;
    registerForPushNotifications().catch((error) => console.warn('Notifications push indisponibles', error));
  }, [enabled]);
}

/** Toucher une notification ouvre l'écran indiqué dans `data.url` (ex. /actualites/<id>). */
export function useNotificationNavigation(enabled: boolean) {
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;

    const open = (response: Notifications.NotificationResponse | null) => {
      const url = response?.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/')) router.push(url as Href);
    };
    // Application ouverte par une notification alors qu'elle était fermée.
    open(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, [enabled]);
}

/** P7-08 : préférences du compte (tout est activé tant qu'il n'a rien changé). */
export function useNotificationPreferences() {
  const { session } = useAuth();
  const accountId = session?.user.id;

  return useQuery({
    queryKey: ['notification-preferences', accountId],
    enabled: !!accountId,
    queryFn: async (): Promise<NotificationPreferences> => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('news, stages, schedule, payments')
        .eq('account_id', accountId!)
        .maybeSingle();
      if (error) throw error;
      return data ?? DEFAULT_PREFERENCES;
    },
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const accountId = session?.user.id;
  const queryKey = ['notification-preferences', accountId];

  return useMutation({
    mutationFn: async (preferences: NotificationPreferences) => {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({ account_id: accountId!, ...preferences });
      if (error) throw error;
    },
    // L'interrupteur bascule tout de suite ; il revient en arrière si l'enregistrement échoue.
    onMutate: async (preferences) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<NotificationPreferences>(queryKey);
      queryClient.setQueryData(queryKey, preferences);
      return { previous };
    },
    onError: (_error, _preferences, context) => queryClient.setQueryData(queryKey, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

/** Autorisation système des notifications sur cet appareil. */
export function useNotificationPermission() {
  return useQuery({
    queryKey: ['notification-permission'],
    enabled: Platform.OS !== 'web',
    queryFn: async () => (await Notifications.getPermissionsAsync()).status,
  });
}
