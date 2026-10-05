import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { MaxContentWidth } from '@/constants/theme';
import { Logo, Space, Text, useDS } from '@/design-system';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>Accueil</TabButton>
          </TabTrigger>
          <TabTrigger name="planning" href="/planning" asChild>
            <TabButton>Planning</TabButton>
          </TabTrigger>
          <TabTrigger name="stages" href="/stages" asChild>
            <TabButton>Stages</TabButton>
          </TabTrigger>
          <TabTrigger name="mon-badminton" href="/mon-badminton" asChild>
            <TabButton>Mon badminton</TabButton>
          </TabTrigger>
          <TabTrigger name="plus" href="/plus" asChild>
            <TabButton>Plus</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const { colors } = useDS();

  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <View style={[styles.tabButton, isFocused && { borderBottomColor: colors.accent }]}>
        <Text variant="label" color={isFocused ? 'text' : 'textMuted'}>
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const { colors } = useDS();

  return (
    <View {...props} style={styles.tabListContainer}>
      <View style={[styles.innerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.brandText}>
          <Logo height={40} />
        </View>
        {props.children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Space.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Space.sm,
    paddingHorizontal: Space.xl,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Space.lg,
    maxWidth: MaxContentWidth,
  },
  brandText: {
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButton: {
    paddingVertical: Space.xs,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
});
