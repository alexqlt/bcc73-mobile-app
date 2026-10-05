import { useState, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useDS } from '../theme-context';
import { Space } from '../tokens';
import { Text } from './text';

export type TextFieldProps = TextInputProps & {
  ref?: Ref<TextInput>;
  label: string;
  hint?: string;
  error?: string;
};

export function TextField({ label, hint, error, style, onFocus, onBlur, ...rest }: TextFieldProps) {
  const { colors, radii, fonts } = useDS();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.danger : focused ? colors.text : colors.border;

  return (
    <View style={styles.container}>
      <Text variant="label">{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          {
            fontFamily: fonts.body,
            color: colors.text,
            backgroundColor: colors.background,
            borderColor,
            borderRadius: radii.md,
          },
          focused && !error && { borderBottomColor: colors.accent, borderBottomWidth: 3 },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text variant="small" color="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="small" color="textMuted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Space.xs + 2,
  },
  input: {
    borderWidth: 1.5,
    paddingHorizontal: Space.md,
    paddingVertical: Space.md,
    fontSize: 16,
  },
});
