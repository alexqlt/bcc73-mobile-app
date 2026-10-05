# BCC73 — application mobile

Application Expo (React Native + TypeScript + Expo Router).

## Démarrer

```bash
npm install
cp .env.example .env.local   # puis renseigner l'URL et la clé publique Supabase
npm start        # serveur de développement (touche w pour le web)
npm run lint
npm run typecheck
```

Ajouter une dépendance : toujours `npx expo install <paquet>` (versions compatibles avec le SDK).

## Organisation de `src/`

```
src/
├── app/            # Routes Expo Router UNIQUEMENT — chaque fichier est un écran
├── screens/        # Corps des écrans, rendus par les fichiers de app/
│   └── <écran>/    #   un dossier par écran, avec ses composants privés
├── design-system/  # Tokens (couleurs, polices, espacements) + composants d'interface
├── components/     # Composants partagés hors design system (navigation, formulaires…)
├── features/       # Logique métier par domaine : requêtes, schémas Zod, hooks
│   └── <domaine>/  #   ex. news/, schedule/, stages/, rankings/, auth/
├── lib/            # Clients techniques : Supabase, TanStack Query…
├── hooks/          # Hooks génériques (pas liés à un domaine)
└── constants/      # Constantes de mise en page
```

### Règles

- **`app/` ne contient que des routes.** Une route reste courte : elle lit les paramètres d'URL et rend un écran de `screens/`.
- **Aucune couleur, police ou taille en dur** : tout passe par le design system (`useDS()`, `<Text variant>`, `Space`).
- **Les données serveur passent par TanStack Query**, avec des hooks dans `features/<domaine>/` (ex. `useNews()`). Les écrans n'appellent jamais Supabase directement.
- **Fichiers en kebab-case** (`news-card.tsx`), un export nommé par composant, styles `StyleSheet.create` en bas du fichier.
- **Code spécifique à une plateforme** : `Platform.select` pour les petites différences, sinon un fichier `.web.tsx` / `.ios.tsx` / `.android.tsx` à côté du fichier par défaut.
- **Alias d'import** : `@/` pointe vers `src/`.
