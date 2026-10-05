import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { useAuth } from '@/features/auth/auth-provider';
import { UserFacingError } from '@/features/auth/errors';
import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type OrderStatus = Database['public']['Enums']['order_status'];

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending: 'Paiement en cours',
  paid: 'Payée',
  cancelled: 'Annulée',
};

/** 2550 → « 25,50 € ». */
export function formatEuros(cents: number) {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

export type CheckoutRequest =
  | { kind: 'shop'; items: { product_id: string; quantity: number }[] }
  | { kind: 'stage'; stageId: string; memberId: string; priceId: string };

/**
 * P6-06 / P6-12 : crée la commande et le paiement HelloAsso (Edge Function helloasso-checkout),
 * ouvre la page de paiement, puis affiche l'écran de suivi du paiement.
 * Le statut « payé » vient uniquement de la base, mise à jour d'après HelloAsso.
 */
export function useCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CheckoutRequest) => {
      const returnTo = Linking.createURL('paiement');
      const { data, error } = await supabase.functions.invoke<{ orderId: string; redirectUrl: string }>(
        'helloasso-checkout',
        { body: { ...request, returnTo } }
      );
      if (error) {
        // Messages de la fonction (stage complet, paiement non configuré…), déjà en français.
        const body = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
        throw body?.error ? new UserFacingError(body.error) : error;
      }
      if (!data) throw new Error('Réponse vide du service de paiement');

      if (Platform.OS === 'web') {
        // Sur le web, le paiement s'ouvre dans un nouvel onglet ; l'écran de suivi attend la confirmation.
        await WebBrowser.openBrowserAsync(data.redirectUrl);
      } else {
        await WebBrowser.openAuthSessionAsync(data.redirectUrl, returnTo);
      }
      return data.orderId;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['stages'] });
    },
    onSuccess: (orderId) => router.navigate({ pathname: '/paiement', params: { order: orderId } }),
  });
}

/** Une commande du compte ; relue toutes les 2 secondes tant que le paiement n'est pas confirmé. */
export function useOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: ['orders', 'item', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, type, status, total_cents, created_at, paid_at, order_items (label, quantity, unit_price_cents)')
        .eq('id', orderId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 2000 : false),
  });
}

/** P6-07 : achats de la boutique du compte, du plus récent au plus ancien (hors paiements abandonnés). */
export function useMyShopOrders() {
  const { session } = useAuth();
  const accountId = session?.user.id;

  return useQuery({
    queryKey: ['orders', 'shop', accountId],
    enabled: !!accountId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, status, total_cents, created_at, paid_at, picked_up_at, order_items (label, quantity)')
        // Les responsables voient toutes les commandes (RLS) : on ne garde que celles du compte.
        .eq('account_id', accountId!)
        .eq('type', 'shop')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

/** Ex. « 5 oct. 2026 ». */
export function formatOrderDate(value: string) {
  return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}
