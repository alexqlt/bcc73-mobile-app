import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, WebTopInset } from '@/constants/theme';
import { Card, SectionTitle, Space, Text, useDesignSystem } from '@/design-system';

export type ComingSoonProps = {
  title: string;
  /** Ce que contiendra l'onglet, d'après APP.md. */
  features: string[];
  /** Phase de TASKS.md qui livrera l'écran. */
  phase: string;
};

/** Écran provisoire des onglets dont la fonctionnalité n'est pas encore développée. */
export function ComingSoon({ title, features, phase }: ComingSoonProps) {
  const insets = useSafeAreaInsets();
  const { tokens, mode } = useDesignSystem();

  return (
    <ScrollView
      style={{ backgroundColor: tokens.colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + WebTopInset + Space.lg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <View style={styles.inner}>
        <SectionTitle eyebrow="Bientôt disponible" title={title} />
        <Card highlighted>
          {features.map((feature) => (
            <Text key={feature}>— {feature}</Text>
          ))}
        </Card>
        <Text variant="small" color="textMuted">
          Prévu dans la {phase}.
        </Text>
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
    gap: Space.xl,
  },
});
