import { Linking, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormError } from '@/components/form/form-error';
import { ErrorState, LoadingState } from '@/components/query-status';
import { MaxContentWidth } from '@/constants/theme';
import { AlertBanner, Button, Card, Space, Text, useDS } from '@/design-system';
import {
  preferenceLabels,
  pushSupportedOnDevice,
  registerForPushNotifications,
  useAppSettings,
  useNotificationPermission,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  type NotificationPreferences,
} from '@/features/notifications/api';

/** P7-08 : choix des notifications reçues, et état de l'autorisation sur l'appareil. */
export function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useDS();
  const preferences = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();
  const permission = useNotificationPermission();
  const settings = useAppSettings();

  const toggle = (key: keyof NotificationPreferences, value: boolean) =>
    preferences.data && update.mutate({ ...preferences.data, [key]: value });

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Space.xxl }]}>
      <View style={styles.inner}>
        <Text variant="subtitle">Notifications</Text>

        {settings.data && !settings.data.pushEnabled ? (
          <AlertBanner
            title="Bientôt disponibles"
            message="Les notifications ne sont pas encore activées par le club. Vos choix ci-dessous seront appliqués dès leur ouverture."
          />
        ) : Platform.OS === 'web' ? (
          <AlertBanner title="Sur téléphone uniquement" message="Les notifications sont envoyées à l’application mobile." />
        ) : !pushSupportedOnDevice ? (
          <AlertBanner
            title="Non disponibles ici"
            message="Les notifications nécessitent l’application installée depuis le store (ou une build de test), pas Expo Go."
          />
        ) : (
          permission.data &&
          permission.data !== 'granted' && (
            <Card>
              <Text>Les notifications sont désactivées pour l’application sur ce téléphone.</Text>
              <Button
                title={permission.data === 'denied' ? 'Ouvrir les réglages du téléphone' : 'Activer les notifications'}
                variant="secondary"
                onPress={async () => {
                  if (permission.data === 'denied') await Linking.openSettings();
                  else await registerForPushNotifications().catch(() => null);
                  permission.refetch();
                }}
              />
            </Card>
          )
        )}

        {preferences.isPending ? (
          <LoadingState />
        ) : preferences.isError ? (
          <ErrorState onRetry={() => preferences.refetch()} />
        ) : (
          <Card>
            {(Object.keys(preferenceLabels) as (keyof NotificationPreferences)[]).map((key) => (
              <View key={key} style={styles.row}>
                <View style={styles.rowText}>
                  <Text variant="bodyStrong">{preferenceLabels[key].title}</Text>
                  <Text variant="small" color="textMuted">
                    {preferenceLabels[key].description}
                  </Text>
                </View>
                <Switch
                  accessibilityLabel={`Notifications : ${preferenceLabels[key].title}`}
                  value={preferences.data[key]}
                  onValueChange={(value) => toggle(key, value)}
                  trackColor={{ true: colors.accent, false: colors.surfaceAlt }}
                  thumbColor={colors.background}
                  ios_backgroundColor={colors.surfaceAlt}
                />
              </View>
            ))}
            <FormError error={update.error} />
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Space.lg,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Space.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingVertical: Space.xs,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
