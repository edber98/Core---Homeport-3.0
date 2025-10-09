Titre: Drawer + CDK DnD + ngx-vflow sur iOS — analyse, correctifs et bonnes pratiques

Contexte
- En mode mobile (iPhone Safari), l’ouverture d’un nz-drawer (NG Zorro) au‑dessus d’un canvas ngx‑vflow + Angular CDK Drag/Drop perturbait les interactions: focus d’inputs impossible, clics masque imprévisibles, auto‑fermeture pendant les drags.
- Les mêmes symptômes se reproduisaient par moments sur desktop, dès qu’on combinait overlay + DnD + rendu dynamique de listes.

Symptômes observés
- Tap sur l’input dans le drawer n’ouvre pas le clavier / perd le focus.
- Clic sur le masque ne ferme pas toujours, ou ferme au mauvais moment (début de drag).
- Sur mobile, la simple présence d’un (click) dans un *ngFor suffisait à faire “sauter” le focus.

Analyse des causes
1) Rendu instable des listes (cause racine)
   - La palette utilisait un getter `get paletteGroups()` qui recréait un nouvel array (et des sous‑arrays) à chaque cycle de Change Detection.
   - En tapant dans l’input de recherche ([(ngModel)]), Angular relançait la CD, le getter réévaluait et recréait toute la structure → destruction/recréation des éléments de la liste, des handlers et des dropLists. iOS perd alors le focus/clavier.

2) Écouteurs “globaux” et preventDefault
   - Des intercepteurs globaux (capture) appelaient preventDefault/stopPropagation pour “protéger” le canvas; sur iOS, ça empêche la synthèse de certains clics/taps nécessaires au focus.
   - ngx‑vflow s’appuie sur d3‑drag; sa directive root pointer ajoute des listeners touchmove; mélangés aux nôtres, ça fragilise encore plus iOS.

3) CSS/overlay spécifiques iOS/CDK
   - CDK Overlay applique `body.cdk-global-scrollblock{overflow:hidden}` pendant les overlays; iOS peut refuser d’ouvrir le clavier dans ce contexte.
   - Un `transform: scale(…)` global sur `app-root` perturbe la géométrie d’inputs/touches sur iOS.

4) IDs CDK DropList et rerenders
   - En overlay, si des dropLists sont dupliquées (drawer + desktop) ou si leurs ids ne sont pas stables, CDK réinitialise, ce qui renforce les problèmes.

Ce que nous avons corrigé
1) Palettes stables (clé)
   - Remplacement du getter par une propriété matérialisée `paletteGroups` maintenue par `rebuildPaletteGroups()`.
   - L’input de recherche n’utilise plus [(ngModel)] mais `[ngModel]` + `(ngModelChange)`, et appelle `rebuildPaletteGroups()`.
   - Ajout de `trackBy` sur `*ngFor` groupes et items pour éviter la recréation DOM inutile.

2) Drawer mobile — palette “click‑only”
   - Dans le drawer, on évite de mixer DnD + overlay: palette sans DnD (clic → ajout du nœud).
   - Le (click) est porté par un bouton interne (et non sur tout le conteneur), sans preventDefault/stopPropagation.

3) Nettoyage des intercepteurs
   - Suppression des “global blockers” (handlers en capture qui faisaient preventDefault) et du canvas‑shield.

4) Ajustements CSS iOS
   - Forcer un bodyStyle “safe” pour le drawer: `{ overflow:auto, WebkitOverflowScrolling:'touch', touchAction:'auto' }`.
   - Neutraliser les effets du scrollblock CDK: `body.cdk-global-scrollblock { overflow:auto !important; -webkit-overflow-scrolling:touch; }`.
   - Éviter `transform: scale` sur les périphériques à pointeur grossier (mobile): `@media (pointer: coarse) { app-root { transform:none; width:100%; } }`.

5) CDK DropList (desktop)
   - IDs uniques et stables: `outside_group_*` pour la palette desktop, `drawer_group_*` si nécessaire.
   - Drop vers `canvasList` (desktop). En mobile (drawer), drag désactivé → clic.

Architecture finale
- Desktop
  - Palette desktop (à gauche) avec DnD (CDK) → drop vers `canvasList`.
  - IDs stables + trackBy, pas de recreate par CD.

- Mobile (drawer)
  - Drawer palette “click‑only” (pas de DnD au‑dessus du canvas); clic ajoute le nœud par code.
  - Le canvas ngx‑vflow reste monté; pas d’intercepteurs globaux ni shield.
  - Inputs dans le drawer (recherche) prennent le focus sur iOS.

Do & Don’t
- Do
  - Matérialiser les collections affichées dans *ngFor (éviter les getters qui recréent des arrays à chaque CD).
  - Ajouter `trackBy` sur *ngFor.
  - Conserver les handler (click) sur des éléments dédiés (ex. bouton) et ne pas appeler preventDefault.
  - Pour iOS + overlay: `overflow:auto`, `-webkit-overflow-scrolling:touch` sur les corps d’overlays.
  - Donner des ids DropList stables et uniques selon le contexte.

- Don’t
  - Ne pas attacher (click) au conteneur parent d’un *ngFor (surtout en overlay mobile) avec preventDefault/stopPropagation.
  - Ne pas recréer les listes à chaque lettre tapée (getter non matérialisé + [(ngModel)] sur le champ de recherche).
  - Éviter transform:scale sur mobile autour d’overlays/inputs.

Fichiers impactés (principaux)
- `src/app/features/flow/flow-builder.component.ts`
  - Ajout: `paletteGroups`, `rebuildPaletteGroups()`, `onPaletteQueryChange()`, `trackGroup/trackItem`.
  - Suppression des “global blockers” et des intercepteurs inutiles.

- `src/app/features/flow/flow-builder.component.html`
  - Drawer palette sans DnD (version click‑only) + bouton interne.
  - Desktop palette avec DnD; ids stables + trackBy.
  - Recherche branchée sur `onPaletteQueryChange()`.

- `src/styles.scss`
  - Patch iOS/CDK: `body.cdk-global-scrollblock { overflow:auto !important; -webkit-overflow-scrolling:touch; }`.
  - Media query pour neutraliser `transform: scale` sur mobile.

Notes supplémentaires
- Si l’on veut restaurer un “drag direct vers le canvas” depuis le drawer sur iOS, il faut soit un proxy (drop interne) soit patcher la logique tactile qui appelle preventDefault côté vflow; dans notre contexte, le click‑only est plus robuste et UX‑cohérent.

