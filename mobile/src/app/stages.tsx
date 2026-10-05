import { ComingSoon } from '@/screens/coming-soon';

export default function StagesScreen() {
  return (
    <ComingSoon
      title="Stages"
      features={['Stages à venir', 'Détail et tarifs', 'Mes inscriptions']}
      phase="phase 6"
    />
  );
}
