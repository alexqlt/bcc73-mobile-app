import { createContext, use, useMemo, type PropsWithChildren } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';

import { getTokens, type DesignTokens, type Mode } from './tokens';

type DesignSystemContextValue = {
  tokens: DesignTokens;
  mode: Mode;
};

const DesignSystemContext = createContext<DesignSystemContextValue | null>(null);

export function DesignSystemProvider({ children }: PropsWithChildren) {
  const scheme = useColorScheme();
  const mode: Mode = scheme === 'dark' ? 'dark' : 'light';
  const value = useMemo(() => ({ tokens: getTokens(mode), mode }), [mode]);

  return <DesignSystemContext value={value}>{children}</DesignSystemContext>;
}

export function useDesignSystem() {
  const context = use(DesignSystemContext);
  if (!context) {
    throw new Error('useDesignSystem doit être utilisé dans un DesignSystemProvider');
  }
  return context;
}

/** Raccourci : les tokens actifs. */
export function useDS() {
  return useDesignSystem().tokens;
}
