import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo, SectionTitle, Space, Text, useDesignSystem } from '@/design-system';

export type AuthScreenProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

/** Mise en page commune aux écrans de connexion, d'inscription et de licence. */
export function AuthScreen({ title, description, children }: AuthScreenProps) {
  const insets = useSafeAreaInsets();
  const { tokens, mode } = useDesignSystem();

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: tokens.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Space.xxl, paddingBottom: insets.bottom + Space.xxl },
        ]}>
        <View style={styles.inner}>
          <Logo />
          <View style={styles.heading}>
            <SectionTitle title={title} />
            {description && (
              <Text variant="body" color="textMuted">
                {description}
              </Text>
            )}
          </View>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Space.lg,
  },
  inner: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: Space.xl,
  },
  heading: {
    gap: Space.sm,
  },
});
