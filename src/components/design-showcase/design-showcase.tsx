import { StatusBar } from 'expo-status-bar';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset, MaxContentWidth } from '@/constants/theme';
import {
  AlertBanner,
  Badge,
  Button,
  Chip,
  NewsCard,
  RankingRow,
  ScheduleSlot,
  SectionTitle,
  Space,
  StageCard,
  TabBarPreview,
  Text,
  TextField,
  useDesignSystem,
  type ColorTokens,
  type TextVariant,
} from '@/design-system';

const scheduleFilters = ['Jeu libre', 'Entraînement', 'Vacances'];

const swatches: (keyof ColorTokens)[] = [
  'background',
  'surface',
  'surfaceAlt',
  'text',
  'textMuted',
  'accent',
  'primary',
  'success',
  'warning',
  'danger',
];

const typeScale: TextVariant[] = ['display', 'title', 'subtitle', 'bodyStrong', 'body', 'small', 'caption', 'label'];

export function DesignShowcase() {
  const insets = useSafeAreaInsets();
  const { tokens, mode } = useDesignSystem();
  const { colors } = tokens;
  const [filter, setFilter] = useState(scheduleFilters[0]);
  const [licence, setLicence] = useState('');
  const licenceError = licence.length > 0 && !/^\d{8}$/.test(licence) ? 'Le numéro de licence comporte 8 chiffres.' : undefined;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + Space.xxl }}>
        <View style={styles.content}>
          <Header />

          <AlertBanner
            title="Info club"
            message="L'entraînement de mardi 20h est exceptionnellement annulé."
          />

          <Section eyebrow="Composants" title="Boutons">
            <View style={styles.wrap}>
              <Button title="Principal" />
              <Button title="Secondaire" variant="secondary" />
            </View>
            <View style={styles.wrap}>
              <Button title="Lien" variant="ghost" />
              <Button title="Désactivé" disabled />
            </View>
          </Section>

          <Section eyebrow="Le club" title="Actualités">
            <NewsCard
              date="5 octobre 2026"
              title="Nouveau partenariat : Unity Training"
              excerpt="Le club s'associe à Unity Training pour proposer des séances de préparation physique à tous les adhérents, jeunes et adultes."
            />
          </Section>

          <Section eyebrow="Aujourd'hui — lundi 5 octobre" title="Planning">
            <View style={styles.wrap}>
              {scheduleFilters.map((item) => (
                <Chip key={item} label={item} selected={item === filter} onPress={() => setFilter(item)} />
              ))}
            </View>
            <ScheduleSlot start="18:00" end="20:00" title="Jeu libre" location="Gymnase du Bon Pasteur" />
            <ScheduleSlot start="20:00" end="22:00" title="Entraînement adultes" location="Gymnase du Bon Pasteur" />
            <ScheduleSlot start="20:00" end="22:00" title="Entraînement compétiteurs" location="Gymnase Mérande" cancelled />
          </Section>

          <Section eyebrow="Mon badminton" title="Mon classement">
            <RankingRow
              rankings={[
                { discipline: 'Simple', level: 'R5', points: 1584, trend: 'up' },
                { discipline: 'Double', level: 'R6', points: 1432, trend: 'stable' },
                { discipline: 'Mixte', level: 'D7', points: 1128, trend: 'down' },
              ]}
            />
          </Section>

          <Section eyebrow="À venir" title="Stages">
            <StageCard
              date="12 novembre 2026"
              title="Stage perfectionnement"
              time="09:00 → 17:00 · Gymnase du Bon Pasteur"
              capacity={16}
              registered={11}
              prices={[
                { label: 'Adhérent', amount: 35 },
                { label: 'Non adhérent', amount: 50 },
                { label: 'Jeune', amount: 25 },
              ]}
            />
          </Section>

          <Section eyebrow="Statuts" title="Badges">
            <View style={styles.wrap}>
              <Badge label="Payé" tone="success" />
              <Badge label="En attente" tone="warning" />
              <Badge label="Annulé" tone="danger" />
              <Badge label="À récupérer" tone="accent" />
              <Badge label="Brouillon" />
            </View>
          </Section>

          <Section eyebrow="Inscription" title="Formulaire">
            <TextField
              label="Numéro de licence"
              placeholder="08XXXXXX"
              keyboardType="number-pad"
              maxLength={8}
              value={licence}
              onChangeText={setLicence}
              hint="Il figure sur votre licence FFBaD."
              error={licenceError}
            />
            <Button title="Vérifier" fullWidth disabled={licence.length !== 8 || !!licenceError} />
          </Section>

          <Section eyebrow="Navigation" title="Barre d'onglets">
            <TabBarPreview />
          </Section>

          <Section eyebrow="Tokens" title="Couleurs">
            <View style={styles.swatches}>
              {swatches.map((name) => (
                <View key={name} style={styles.swatch}>
                  <View
                    style={[
                      styles.swatchColor,
                      { backgroundColor: colors[name], borderColor: colors.border, borderRadius: tokens.radii.sm },
                    ]}
                  />
                  <Text variant="caption" color="textMuted">
                    {name}
                  </Text>
                  <Text variant="caption">{colors[name].toUpperCase()}</Text>
                </View>
              ))}
            </View>
          </Section>

          <Section eyebrow="Tokens" title="Typographie">
            {typeScale.map((variant) => (
              <View key={variant} style={styles.typeRow}>
                <Text variant="caption" color="textMuted" style={styles.typeName}>
                  {variant}
                </Text>
                <Text variant={variant} style={styles.typeSample} numberOfLines={1}>
                  Badminton Chambéry
                </Text>
              </View>
            ))}
          </Section>
        </View>
      </ScrollView>
    </View>
  );
}

function Header() {
  const { colors, radii } = useDesignSystem().tokens;

  return (
    <View style={styles.header}>
      <View style={styles.logo}>
        <Text variant="display">BCC</Text>
        <View style={[styles.logoBadge, { backgroundColor: colors.accent, borderRadius: radii.sm }]}>
          <Text variant="display" color="onAccent">
            73
          </Text>
        </View>
      </View>
      <Text variant="body" color="textMuted">
        Bonjour Jean 👋
      </Text>
    </View>
  );
}

function Section({ eyebrow, title, children }: { eyebrow?: string; title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <SectionTitle eyebrow={eyebrow} title={title} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Space.lg,
    gap: Space.xxl,
  },
  header: {
    gap: Space.xs,
    paddingTop: Space.sm,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
  },
  logoBadge: {
    paddingHorizontal: Space.sm,
  },
  section: {
    gap: Space.md,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Space.sm,
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.md,
  },
  swatch: {
    width: 92,
    gap: 2,
  },
  swatchColor: {
    height: 48,
    borderWidth: 1,
    marginBottom: Space.xs,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  typeName: {
    width: 76,
  },
  typeSample: {
    flex: 1,
  },
});
