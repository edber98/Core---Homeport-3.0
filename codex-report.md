# Codex Build Report

Date: 2025-08-18

1) Résumé du style appliqué
- Architecture: Angular 20, TypeScript, standalone components, lazy features sous `src/app/features/*`.
- Nommage: fichiers/dossiers en kebab-case; classes/components en PascalCase; Inputs/Outputs en tête, lifecycle ensuite.
- Structure: entrée `src/main.ts`, composant racine `src/app/app.ts`, routes `src/app/app.routes.ts`, modules réutilisables sous `src/app/modules/*`, pages/layouts sous `src/app/{pages,layout}`.
- UI: NG Zorro; grille `nz-row`/`nz-col` et `trackBy` pour réduire le churn DOM.
- Styles: SCSS/LESS selon fichier; formatage via `.editorconfig` et Prettier (override HTML dans `package.json`).
- Build: budgets et allowlist CommonJS via `angular.json`; assets dans `public/` copiés vers `dist`.
- Tests: Jasmine + Karma; specs à côté du code (`*.spec.ts`).

2) Liste des changements effectués
- Correctif global iOS: prise en charge `100dvh` + fallback `-webkit-fill-available` pour éviter les erreurs de hauteur sur iPhone (barre d’adresse dynamique).
- Conteneur de scroll principal: `-webkit-overflow-scrolling: touch`, `overscroll-behavior: contain` et `padding-bottom: calc(12px + env(safe-area-inset-bottom))` pour atteindre le bas et éviter l’écrasement.
- Website Viewer: ajout d’un `padding-bottom` réactif sur mobile `calc(96px + env(safe-area-inset-bottom))`, même approche que l’éditeur de site.
- Global listes: règle CSS pour `.list-page`, `.viewer`, `.tpl-editor` afin d’appliquer le `padding-bottom` sur mobile à toutes les listes/pages.
- Génération/mise à jour du présent rapport `codex-report.md`.

3) Fichiers modifiés
- `src/styles.scss` (support 100dvh + fallback iOS; padding-bas global pour listes/pages).
- `src/app/layout/layout-main/layout-main.scss` (scroll iOS + safe-area bottom).
- `src/app/features/website/website-viewer.component.ts` (padding-bottom mobile/safe-area).
- `codex-report.md` (rapport de build actualisé).

4) Message Conventional Commits (simulé)
fix(ios): global viewport/scroll and safe-area padding

Body:
- Use `100dvh` with Safari fallback to `-webkit-fill-available` to avoid iPhone height miscalc.
- Add momentum scrolling and `padding-bottom: env(safe-area-inset-bottom)` to main scroll container.
- Apply responsive bottom padding to website viewer, aligned with website editor behavior.
- Build: `ng build --configuration production` OK; output in `dist/Homeport`.

Footer:
Scope: layout, website
