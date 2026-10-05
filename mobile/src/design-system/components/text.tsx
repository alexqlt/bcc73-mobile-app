import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useDS } from '../theme-context';
import type { ColorTokens, DesignTokens } from '../tokens';

export type TextVariant =
  | 'display'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'bodyStrong'
  | 'small'
  | 'caption'
  | 'label';

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  color?: keyof ColorTokens;
};

export function variantStyle(tokens: DesignTokens, variant: TextVariant): TextStyle {
  const { fonts } = tokens;
  const heading = (fontSize: number, lineHeight: number): TextStyle => ({
    fontFamily: fonts.heading,
    fontSize,
    lineHeight,
    textTransform: 'uppercase',
  });

  switch (variant) {
    case 'display':
      return heading(34, 38);
    case 'title':
      return heading(24, 28);
    case 'subtitle':
      return heading(18, 22);
    case 'body':
      return { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 };
    case 'bodyStrong':
      return { fontFamily: fonts.bodyStrong, fontSize: 16, lineHeight: 24 };
    case 'small':
      return { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 };
    case 'caption':
      return { fontFamily: fonts.body, fontSize: 12, lineHeight: 16 };
    case 'label':
      return {
        fontFamily: fonts.label,
        fontSize: 13,
        lineHeight: 16,
        letterSpacing: 1,
        textTransform: 'uppercase',
      };
  }
}

export function Text({ variant = 'body', color = 'text', style, ...rest }: TextProps) {
  const tokens = useDS();
  return (
    <RNText style={[variantStyle(tokens, variant), { color: tokens.colors[color] }, style]} {...rest} />
  );
}
