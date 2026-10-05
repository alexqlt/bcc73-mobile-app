import type { BadgeTone } from '@/design-system';

import type { Member } from './api';

export const memberStatusLabel: Record<Member['status'], string> = {
  pending: 'En attente de validation',
  approved: 'Licence validée',
  rejected: 'Refusée',
};

export const memberStatusTone: Record<Member['status'], BadgeTone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};
