Flow Builder — Spotlight “Ajouter un nœud” (WIP)

Objectif
- Modal légère, style clair, sans en-tête “Node”, avec recherche type Spotlight.
- Scroll interne (jamais dépasser l’écran, mobile inclus).
- Liste groupée (providers), cartes avec à droite un bloc logo/avatar (fond coloré provider) comme dans les nœuds.

Implémentation actuelle
- Composant: `spotlight-add-node` (standalone) — `src/app/features/flow/components/spotlight-add-node.component.ts`.
- Intégration: `flow-builder.component.html` → modal NZ contient `*nzModalContent` + `<spotlight-add-node ...>`.
- Données: groupes dérivés de `addNodeCandidates` via `paletteSvc.buildGroups(...)`.
- Recherche: `query` bi-directionnelle (`queryChange` sortant), filtrage dans parent (FlowBuilder) pour garder logique unique.
- Sélection: `pick` émet l’item; si null (Entrée sans résultat), parent interprète comme “prompt IA”.

Style / UX
- Clair, minimal: bordures `#E2E1E4`, textes `#111/#6b7280`, hover bleu clair.
- Hauteur: `max-height: min(60vh, 520px)` sur la liste → scroll interne, mobile `56vh`.
- Padding sobres: header (10–12px), liste (8–10px), items (10px, radius 12px).
- À droite: `.app-chip` (32×32, radius 10px, fond provider) avec icône (template > provider > simpleicons).

Points à faire (prochaines étapes)
1) Navigation clavier (↑/↓, Entrée) avec focus actif dans la liste + scroll-into-view.
2) Bloc “Suggestions IA” (carte) lorsque aucun résultat (sans dépasser budget CSS); action “Utiliser comme prompt”.
3) Ajuster couleurs selon thème (vars globales) + état actif/selection.
4) Option `[nzMaskClosable]` configurable sur la modal selon préférence produit.
5) Harmoniser plus tard le panneau gauche pour adopter ce style (sans partage obligatoire pour l’instant).

Notes techniques
- Budget CSS: styles Spotlight localisés dans le composant; taille modeste pour respecter `anyComponentStyle`.
- Icônes: priorité à `template.iconUrl` > `template.icon` (class) > `provider.iconUrl` > `provider.iconClass` > SimpleIcons.
- Provider: récup via `getAppByIdFn` passé par le parent (FlowBuilder) pour éviter dépendance directe.

