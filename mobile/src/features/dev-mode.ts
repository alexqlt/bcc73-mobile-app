import { useSyncExternalStore } from 'react';

import { useIsAdmin } from '@/features/permissions/api';
import { sessionStorage } from '@/lib/session-storage';

/**
 * Mode développeur (administrateurs) : les boutons « Payer avec HelloAsso » des stages et de la
 * boutique valident la commande sans paiement (marquée « Test », exclue des ventes). Réglage gardé
 * sur l'appareil ; la base refuse de toute façon ces commandes aux autres comptes.
 */
const STORAGE_KEY = 'bcc73.devMode';
const listeners = new Set<() => void>();

function read() {
  try {
    return sessionStorage?.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setDevMode(enabled: boolean) {
  try {
    if (enabled) sessionStorage?.setItem(STORAGE_KEY, 'true');
    else sessionStorage?.removeItem(STORAGE_KEY);
  } catch {
    // Stockage indisponible : le réglage ne sera simplement pas retenu.
  }
  listeners.forEach((listener) => listener());
}

/** `available` : le compte peut l'activer (administrateur) ; `enabled` : il est actif. */
export function useDevMode() {
  const isAdmin = useIsAdmin();
  const stored = useSyncExternalStore(subscribe, read, () => false);
  return { available: isAdmin, enabled: isAdmin && stored, setEnabled: setDevMode };
}
