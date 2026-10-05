import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useDS } from '@/design-system';

/** Onglets principaux, d'après la navigation décrite dans APP.md. Version web : app-tabs.web.tsx. */
export default function AppTabs() {
  const { colors } = useDS();

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.accent}
      tintColor={colors.text}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Accueil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="planning">
        <NativeTabs.Trigger.Label>Planning</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="boutique">
        <NativeTabs.Trigger.Label>Boutique</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bag.fill" md="shopping_bag" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="mon-profil">
        <NativeTabs.Trigger.Label>Mon profil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle.fill" md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
