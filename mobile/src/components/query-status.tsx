import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Card, Space, Text, useDS } from '@/design-system';

/** Chargement en cours. */
export function LoadingState() {
  const { colors } = useDS();

  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.text} />
    </View>
  );
}

/** Erreur de chargement, avec un bouton pour réessayer. */
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <Text>Impossible de charger les informations. Vérifiez votre connexion.</Text>
      <Button title="Réessayer" variant="ghost" onPress={onRetry} />
    </Card>
  );
}

const styles = StyleSheet.create({
  loading: {
    paddingVertical: Space.xxl,
    alignItems: 'center',
  },
});
