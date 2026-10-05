import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import { supabase } from '@/lib/supabase';

export type Role = { id: string; name: string; is_system: boolean };

/**
 * Rôles de l'utilisateur connecté (Administrateur, Secrétariat…), lus dans la base.
 * L'app ne s'en sert que pour l'affichage : chaque action reste vérifiée côté serveur.
 */
export function useMyRoles() {
  const { session } = useAuth();
  const accountId = session?.user.id;

  return useQuery({
    queryKey: ['roles', accountId],
    enabled: !!accountId,
    queryFn: async (): Promise<Role[]> => {
      const { data, error } = await supabase
        .from('account_roles')
        .select('roles (id, name, is_system)')
        .eq('account_id', accountId!);
      if (error) throw error;
      return data
        .flatMap((row) => (row.roles ? [row.roles] : []))
        .sort((a, b) => Number(b.is_system) - Number(a.is_system) || a.name.localeCompare(b.name, 'fr'));
    },
  });
}
