import { useLocalSearchParams } from 'expo-router';

import { PlanningScreen } from '@/screens/planning/planning-screen';

/**
 * `jour` (1 = lundi) ouvre le planning sur ce jour, filtres réinitialisés (lien depuis un créneau annulé
 * de l'accueil) ; `t` change à chaque lien pour repartir de cet état même si l'écran était déjà ouvert.
 */
export default function PlanningTab() {
  const { jour, t } = useLocalSearchParams<{ jour?: string; t?: string }>();
  const weekday = Number(jour);
  return <PlanningScreen key={t ?? 'planning'} initialWeekday={weekday >= 1 && weekday <= 7 ? weekday : undefined} />;
}
