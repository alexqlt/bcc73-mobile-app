import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { useDS } from '../theme-context';
import { Text } from './text';

export type AvatarProps = {
  /** URL de la photo ; à défaut, les initiales sur fond jaune. */
  uri?: string | null;
  initials: string;
  size?: number;
};

/** Photo de profil ronde (ou initiales), entourée de jaune comme les éléments mis en avant du club. */
export function Avatar({ uri, initials, size = 72 }: AvatarProps) {
  const { colors } = useDS();
  const round = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={[styles.frame, round, { borderColor: colors.accent, backgroundColor: colors.accent }]}>
      {uri ? (
        <Image source={uri} recyclingKey={uri} contentFit="cover" transition={150} style={round} accessibilityIgnoresInvertColors />
      ) : (
        <Text variant="title" color="onAccent" style={{ fontSize: size * 0.38, lineHeight: size * 0.46 }}>
          {initials}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
