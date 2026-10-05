/**
 * Constantes de mise en page. Les couleurs, polices et espacements du design
 * system sont dans `src/design-system/tokens.ts`.
 */

import { Platform } from 'react-native';

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
