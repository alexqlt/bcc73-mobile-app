import { router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset, MaxContentWidth, WebTopInset } from '@/constants/theme';
import { Card, SectionTitle, Space, Text, useDesignSystem } from '@/design-system';

const entries: { title: string; description: string; href: Href }[] = [
  { title: 'Boutique', description: 'Tubes de volants, à payer en ligne et récupérer au club', href: '/boutique' },
  { title: 'Mes achats', description: 'Commandes payées et articles à récupérer', href: '/achats' },
];

/** Onglet « Plus » (APP.md) : boutique et achats. */
export function PlusScreen() {
  const insets = useSafeAreaInsets();
  const { tokens, mode } = useDesignSystem();

  return (
    <ScrollView
      style={{ backgroundColor: tokens.colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + WebTopInset + Space.lg, paddingBottom: insets.bottom + BottomTabInset + Space.xxl },
      ]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <View style={styles.inner}>
        <SectionTitle title="Plus" />
        {entries.map((entry) => (
          <Pressable
            key={entry.title}
            accessibilityRole="link"
            onPress={() => router.push(entry.href)}
            style={({ pressed }) => pressed && styles.pressed}>
            <Card>
              <Text variant="subtitle">{entry.title} ›</Text>
              <Text variant="small" color="textMuted">
                {entry.description}
              </Text>
            </Card>
          </Pressable>
        ))}
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
    gap: Space.md,
  },
  pressed: {
    opacity: 0.8,
  },
});
