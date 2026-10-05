import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useDS } from '../theme-context';
import { Space } from '../tokens';
import { Text } from './text';

const tabs = ['Accueil', 'Planning', 'Stages', 'Mon profil', 'Plus'];

/** Aperçu de la future barre d'onglets : onglet actif marqué d'une barre jaune. */
export function TabBarPreview() {
  const { colors, radii } = useDS();
  const [active, setActive] = useState(0);

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
      ]}>
      {tabs.map((tab, index) => {
        const selected = index === active;
        return (
          <Pressable key={tab} style={styles.item} onPress={() => setActive(index)}>
            {selected && <View style={[styles.topIndicator, { backgroundColor: colors.accent }]} />}
            <View
              style={[
                styles.icon,
                { borderRadius: radii.sm, borderColor: selected ? colors.text : colors.textMuted },
              ]}
            />
            <Text
              variant="caption"
              numberOfLines={1}
              style={{ color: selected ? colors.text : colors.textMuted }}>
              {tab}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderWidth: 1,
    paddingVertical: Space.sm,
    overflow: 'hidden',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: Space.xs,
    paddingTop: Space.xs,
  },
  topIndicator: {
    position: 'absolute',
    top: -Space.sm,
    height: 4,
    left: Space.sm,
    right: Space.sm,
  },
  icon: {
    width: 22,
    height: 22,
    borderWidth: 2,
  },
});
