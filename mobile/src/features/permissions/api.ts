import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import { supabase } from '@/lib/supabase';

/**
 * Permissions de l'utilisateur connecté, calculées par la base (my_permissions).
 * L'app ne s'en sert que pour adapter l'affichage : chaque action reste vérifiée côté serveur.
 */
export function usePermissions() {
  const { session } = useAuth();
  const accountId = session?.user.id;

  return useQuery({
    queryKey: ['permissions', accountId],
    enabled: !!accountId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_permissions');
      if (error) throw error;
      return new Set(data);
    },
  });
}
