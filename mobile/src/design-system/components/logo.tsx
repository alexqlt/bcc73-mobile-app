import { StyleSheet, View } from 'react-native';

import { useDS } from '../theme-context';
import { Space } from '../tokens';
import { Text } from './text';

/** Logo texte « BCC73 », le 73 sur fond jaune. */
export function Logo() {
  const { colors, radii } = useDS();

  return (
    <View style={styles.logo} accessibilityRole="header" accessibilityLabel="BCC73">
      <Text variant="display">BCC</Text>
      <View style={[styles.badge, { backgroundColor: colors.accent, borderRadius: radii.sm }]}>
        <Text variant="display" color="onAccent">
          73
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
  },
  badge: {
    paddingHorizontal: Space.sm,
  },
});
