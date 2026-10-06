import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo, SectionTitle, Space, Text, useDS } from '@/design-system';

import {
  DIAGONAL_HEIGHT,
  HERO_LOGO_HEIGHT,
  HERO_PADDING_BOTTOM,
  HERO_PADDING_TOP,
  SplashIntro,
} from './splash-intro';

export type AuthScreenProps = {
  title: string;
  description?: string;
  children: ReactNode;
  /** Joue l'animation d'introduction (logo plein écran qui rejoint le bandeau). */
  intro?: boolean;
};

/**
 * Mise en page commune aux écrans de connexion, d'inscription et de licence, inspirée de la
 * page d'accueil de bcc73.com : bandeau jaune terminé en diagonale, logo au volant blanc,
 * contenu sur fond gris clair.
 */
export function AuthScreen({ title, description, children, intro = false }: AuthScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useDS();

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.surface }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Texte sombre : la barre d'état est posée sur le jaune. */}
      <StatusBar style="dark" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Space.xxl }]}>
        <View style={[styles.hero, { backgroundColor: colors.accent, paddingTop: insets.top + HERO_PADDING_TOP }]}>
          <Logo height={HERO_LOGO_HEIGHT} background="accent" />
        </View>
        <View
          style={[
            styles.diagonal,
            { borderTopColor: colors.accent, borderRightWidth: width },
          ]}
        />

        <View style={styles.inner}>
          <View style={styles.heading}>
            <SectionTitle title={title} centered />
            {description && (
              <Text variant="body" color="textMuted" style={styles.centeredText}>
                {description}
              </Text>
            )}
          </View>
          {children}
        </View>
      </ScrollView>
      {intro && <SplashIntro />}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  hero: {
    alignItems: 'center',
    paddingBottom: HERO_PADDING_BOTTOM,
  },
  // Triangle jaune : haut sur toute la largeur, descend à gauche (comme le panneau du site).
  diagonal: {
    width: 0,
    height: 0,
    borderTopWidth: DIAGONAL_HEIGHT,
    borderRightColor: 'transparent',
  },
  // Centré horizontalement (480 px au plus) et verticalement dans l'espace sous le bandeau.
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: Space.lg,
    gap: Space.xl,
  },
  heading: {
    alignItems: 'center',
    gap: Space.md,
  },
  centeredText: {
    // Pleine largeur pour que le texte revienne à la ligne au lieu de déborder.
    alignSelf: 'stretch',
    textAlign: 'center',
  },
});

/** Styles partagés par les écrans d'authentification. */
export const authStyles = StyleSheet.create({
  /** Lien secondaire (bouton « ghost ») centré sous le formulaire. */
  link: {
    alignSelf: 'center',
  },
});
