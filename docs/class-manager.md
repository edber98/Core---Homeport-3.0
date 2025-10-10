# UI Class Manager — Guide

Ce document décrit le Class Manager ajouté au UI Builder, son fonctionnement, ce qu’il génère, et comment l’utiliser efficacement (responsive + états + tokens).

## Objectifs

- Gérer des classes CSS (y compris combo-classes comme `.btn.primary.small`).
- Éditer les styles d’une classe sans écrire de CSS: via formulaires clé/valeur.
- Supporter les états `:hover`, `:active`, `:focus` et les breakpoints (XS/SM/MD/LG/XL).
- Utiliser des Design Tokens (`--color-primary`, `--space-2`, etc.) pour rester cohérent.

## Où le trouver

- Route: `/ui-builder`
- Panneau droit: “Classes — Manager” (au-dessus du Navigator et de l’Inspector).

## Concepts

- Classe: un nom simple (`btn`) ou une combo (`btn.primary.small`).
- État (Scope): `Base`, `:hover`, `:active`, `:focus`.
- Breakpoint: `Auto` (base) ou `XS/SM/MD/LG/XL` (override local). Le sélecteur de Preview (toolbar) définit le breakpoint courant.
- Design Tokens: variables CSS globales définies sur `:root` (ex.: `--color-primary`).

## Ce qui est stocké (données)

Le service `UiClassStyleService` maintient une liste de définitions:

```
UiClassDef = {
  name: 'btn.primary',      // combo
  parts: ['btn','primary'], // tokens
  styles: {
    base: { base: { color: 'var(--color-primary)' }, bp: { xs: { fontSize: '14px' } }},
    hover: { base: { opacity: '0.9' } },
    focus: { base: { outline: '2px solid var(--color-primary)' } }
  }
}
```

- `styles[state].base`: styles applicables à tous les breakpoints.
- `styles[state].bp[bp]`: overrides pour un breakpoint donné (ex.: XS).

## Application sur le canvas

- Les classes attachées à l’élément sélectionné sont fusionnées en premier, puis les styles propres à l’élément (base + override du breakpoint). L’état de preview (Normal/Hover/Active/Focus) peut être switché depuis la bottom bar.
- Fusion: `classStyles (état+bp) + node.style (base) + node.styleBp[bp]`.

## UI et ergonomie

- Liste de classes: créer `.class` ou `.a.b.c` (combo). Cliquer pour sélectionner.
- Édition (panneau repliable): renommer/supprimer; scope d’état; saisie clé/valeur des styles.
- Aide “unités”: pour une valeur numérique, un mini sélecteur (px/%/rem/vw/vh) complète la valeur.
- Tokens: champ “valeur” propose `var(--token)` via datalist. Les tokens sont gérés par `UiTokensService` et appliqués à `:root`.

## Responsive & états

- Le breakpoint courant est celui de la Preview (Auto/XS/SM/MD/LG/XL). 
  - En Auto, vous modifiez le “base” de la classe.
  - En XS/SM/… vous modifiez l’override `bp[bp]` de la classe.
- Le scope d’état (Base/Hover/Active/Focus) est sélectionnable dans le panneau d’édition.
- La bottom bar permet de simuler l’état visuellement (Normal/Hover/Active/Focus).

## Inheritance & cascade (fondations)

- Les classes sont fusionnées dans l’ordre d’association sur l’élément (la vue actuelle ne limite pas l’ordre; une future version gèrera l’ordonnancement explicite et les indicateurs d’override/héritage par propriété).
- Reset par propriété et indicateurs (hérité vs override) seront ajoutés dans l’Inspector avancé.

## Ce qui est généré (et ce qui ne l’est pas)

- Aucune feuille de style `.css` n’est générée aujourd’hui: les styles sont conservés en mémoire (JSON) et injectés en ligne via `ngStyle` pour l’aperçu WYSIWYG.
- Export: l’export JSON du projet inclut ces définitions, ce qui permettra à terme de générer un CSS statique (option ciblée dans une étape suivante).

## API (développeurs)

- `UiClassStyleService`:
  - `ensure(name)`, `rename(old,new)`, `remove(name)`
  - `setStyles(name, state, bp, styles)`
  - `getStyles(name, state, bp)`
  - `effectiveForClasses(classList, state, bp)`
- `UiTokensService`:
  - `tokens: Record<string,string>`
  - `set(name,value)`, `remove(name)`, `applyToDocument()`
- `UiBreakpointsService`:
  - `list`, `current`, `cascadeLock`
  - `add/remove/setCurrent/setCascadeLock`

## Roadmap (prochaines améliorations)

- Indicators par propriété: hérité vs override (avec bouton Reset, au BP ou global).
- “Cascade lock”: propager/figer les valeurs via un verrou (UI + service déjà prévu).
- Manager des classes appliquées sur la sélection, avec toggles et réordonnancement.
- Export CSS: génération de feuilles de style à partir des définitions, optionnelle.

