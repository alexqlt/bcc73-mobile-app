import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Logo, Space, useDS } from '@/design-system';

/** Hauteur du logo dans le bandeau jaune des écrans de connexion. */
export const HERO_LOGO_HEIGHT = 140;

/** Marge au-dessus du logo dans le bandeau (en plus de la zone de la barre d'état). */
export const HERO_PADDING_TOP = Space.xl;

/** Marge sous le logo dans le bandeau. */
export const HERO_PADDING_BOTTOM = Space.sm;

/** Hauteur du biseau qui termine le bandeau jaune. */
export const DIAGONAL_HEIGHT = 56;

const LOGO_RATIO = 752 / 568;

/** Largeur du logo sur l'écran de démarrage natif : app.json > expo-splash-screen > imageWidth. */
const SPLASH_LOGO_WIDTH = 220;

/** Le logo reste affiché en plein écran, puis rejoint le bandeau. */
const HOLD_DURATION = 2000;
const MOVE_DURATION = 700;

/** Courbe « déplacement à l'écran » du skill expo-animation. */
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

/**
 * Introduction au lancement de l'app : prend le relais de l'écran de démarrage natif (même fond
 * jaune, même logo, même taille), puis après 2 secondes le jaune remonte et le logo rétrécit jusqu'à
 * sa place dans le bandeau, révélant le formulaire de connexion.
 *
 * Seuls des transforms et l'opacité sont animés (thread UI). Avec « Réduire les animations »,
 * le calque disparaît en fondu, sans déplacement.
 */
export function SplashIntro() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { colors } = useDS();
  const reduceMotion = useReducedMotion();
  const [isDone, setIsDone] = useState(false);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withDelay(
        HOLD_DURATION,
        withTiming(1, { duration: reduceMotion ? 300 : MOVE_DURATION, easing: EASE_IN_OUT }, (finished) => {
          if (finished) {
            scheduleOnRN(setIsDone, true);
          }
        })
      )
    );
  }, [progress, reduceMotion]);

  const heroHeight = insets.top + HERO_PADDING_TOP + HERO_LOGO_HEIGHT + HERO_PADDING_BOTTOM;
  const logoTop = insets.top + HERO_PADDING_TOP;
  // Au départ, le logo est centré à l'écran, à la taille de l'écran de démarrage natif.
  const startOffset = windowHeight / 2 - (logoTop + HERO_LOGO_HEIGHT / 2);
  const startScale = SPLASH_LOGO_WIDTH / (HERO_LOGO_HEIGHT * LOGO_RATIO);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? interpolate(progress.get(), [0, 1], [1, 0]) : 1,
  }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: reduceMotion ? 0 : interpolate(progress.get(), [0, 1], [0, heroHeight - windowHeight]) },
    ],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: reduceMotion
      ? []
      : [
          { translateY: interpolate(progress.get(), [0, 1], [startOffset, 0]) },
          { scale: interpolate(progress.get(), [0, 1], [startScale, 1]) },
        ],
  }));

  if (isDone) {
    return null;
  }

  return (
    <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]}>
      <Animated.View style={[styles.panel, panelStyle]}>
        <View style={{ height: windowHeight, backgroundColor: colors.accent }} />
        {/* Même biseau que le bandeau : la forme reste continue pendant la remontée. */}
        <View
          style={[
            styles.diagonal,
            styles.seamless,
            { borderTopColor: colors.accent, borderRightWidth: windowWidth },
          ]}
        />
      </Animated.View>
      <Animated.View style={[styles.logo, { top: logoTop }, logoStyle]}>
        <Logo height={HERO_LOGO_HEIGHT} background="accent" />
      </Animated.View>
      {/* Bloque les touches pendant l'introduction. */}
      <View style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  diagonal: {
    width: 0,
    height: 0,
    borderTopWidth: DIAGONAL_HEIGHT,
    borderRightColor: 'transparent',
  },
  // Chevauche le bloc d'un pixel : évite une ligne claire pendant le mouvement (positions décimales).
  seamless: {
    marginTop: -1,
  },
  logo: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
