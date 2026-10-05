import { StyleSheet, View } from 'react-native';

import { useDS } from '../theme-context';
import { Space } from '../tokens';
import { Text } from './text';

/** Bandeau d'information urgente, comme `#BandeauInfoAlerte` sur le site. */
export function AlertBanner({ title, message }: { title: string; message: string }) {
  const { colors, radii } = useDS();

  return (
    <View style={[styles.banner, { backgroundColor: colors.alertBackground, borderRadius: radii.md }]}>
      <Text variant="label" style={{ color: colors.alertText }}>
        {title}
      </Text>
      <Text variant="small" style={{ color: colors.alertText }}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    padding: Space.lg,
    gap: Space.xs,
  },
});
