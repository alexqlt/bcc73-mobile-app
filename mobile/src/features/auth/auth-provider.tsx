import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  /** `true` tant que la session enregistrée sur le téléphone n'a pas été relue. */
  isLoading: boolean;
  /** `true` si la session vient d'être coupée parce que le club a archivé ou bloqué le compte. */
  accountDisabled: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accountDisabled, setAccountDisabled] = useState(false);
  const userId = session?.user.id;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'SIGNED_IN') setAccountDisabled(false);
      // À la déconnexion, on oublie toutes les données de l'utilisateur précédent.
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  // Compte archivé ou bloqué pendant qu'il était connecté : vérifié à l'ouverture et à chaque retour
  // dans l'app, puis déconnexion locale (la connexion suivante est refusée par Supabase Auth).
  useEffect(() => {
    if (!userId) return;
    const check = async () => {
      const { data } = await supabase.from('accounts').select('status').eq('id', userId).maybeSingle();
      if (data && data.status !== 'active') {
        setAccountDisabled(true);
        await supabase.auth.signOut({ scope: 'local' });
      }
    };
    check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => subscription.remove();
  }, [userId]);

  return <AuthContext value={{ session, isLoading, accountDisabled }}>{children}</AuthContext>;
}

export function useAuth() {
  const context = use(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
}
