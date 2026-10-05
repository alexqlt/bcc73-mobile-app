import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import { supabase } from '@/lib/supabase';

export type Permission = { code: string; description: string };

/**
 * Permissions de l'utilisateur connecté, calculées par la base (my_permissions), avec leur libellé.
 * L'app ne s'en sert que pour adapter l'affichage : chaque action reste vérifiée côté serveur.
 */
export function usePermissions() {
  const { session } = useAuth();
  const accountId = session?.user.id;

  return useQuery({
    queryKey: ['permissions', accountId],
    enabled: !!accountId,
    queryFn: async (): Promise<Permission[]> => {
      const { data: codes, error } = await supabase.rpc('my_permissions');
      if (error) throw error;
      if (codes.length === 0) return [];

      const { data, error: descriptionsError } = await supabase
        .from('permissions')
        .select('code, description')
        .in('code', codes)
        .order('code');
      if (descriptionsError) throw descriptionsError;
      return data;
    },
  });
}
