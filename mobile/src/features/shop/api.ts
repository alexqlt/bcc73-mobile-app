import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/** P6-06 : articles visibles de la boutique (les responsables voient aussi les masqués : filtrés ici). */
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, price_cents')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}
