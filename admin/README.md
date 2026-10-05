# BCC73 — back-office

Application web d'administration du club (Next.js + TypeScript + Tailwind CSS).

## Démarrer

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run typecheck
npm run build
```

## Organisation

- `src/app/` : routes (App Router). Chaque dossier contenant un `page.tsx` est une page.
- `src/app/globals.css` : tokens du design system « Club », identiques à ceux de l'app mobile
  (`mobile/src/design-system/tokens.ts`). Utilisables en classes Tailwind : `bg-accent`, `text-muted`, `font-heading`…

Cette version de Next.js a des changements majeurs : se référer à la documentation embarquée
dans `node_modules/next/dist/docs/` (voir `AGENTS.md`).
