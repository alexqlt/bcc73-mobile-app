import { Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';

import { useDS } from '../theme-context';
import { Text } from './text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  style?: ViewStyle;
};

export function Button({ title, variant = 'primary', fullWidth, disabled, style, ...rest }: ButtonProps) {
  const { colors, radii, fonts } = useDS();

  const container: ViewStyle =
    variant === 'primary'
      ? { backgroundColor: colors.primary, borderColor: colors.primary }
      : variant === 'secondary'
        ? { backgroundColor: 'transparent', borderColor: colors.text }
        : { backgroundColor: 'transparent', borderColor: 'transparent', paddingHorizontal: 0 };

  const textColor = variant === 'primary' ? colors.onPrimary : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { borderRadius: radii.md },
        container,
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...rest}>
      <Text
        style={[
          styles.label,
          { fontFamily: fonts.label, color: textColor },
          variant === 'ghost' && { borderBottomColor: colors.accent, ...styles.ghostLabel },
        ]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Proportions reprises du site (padding 16 × 24, libellé en majuscules).
  base: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  label: {
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  ghostLabel: {
    borderBottomWidth: 3,
    paddingBottom: 2,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.4,
  },
});
