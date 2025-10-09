# Dynamic Form Builder — Architecture & Components

Objectif: réduire la taille du composant `dynamic-form-builder` en séparant la logique UI (panneaux), la logique d’arbre (DnD), et la personnalisation, tout en gardant un schéma unique comme source de vérité pour l’aperçu.

## Arborescence cible (features/dynamic-form)

- dynamic-form-builder.component.{ts,html,scss}
  - Orchestration: sélection courante, import/export, rafraîchissement, liaison avec l’aperçu.
  - Délègue la logique de DnD et de personnalisation à des services.
- components/
  - context-panel.component.{ts,html} [FAIT]
    - Contient la « Palette & Contexte »: boutons d’ajout (+Step, +Section, +Field), arbre de navigation, import/export.
    - Inputs: `treeNodes`, `treeSelectedKeys`, `stepsMode`, `canAddSectionBtn`, `canAddFieldBtn`, `canQuickAddField`, `json`.
    - Outputs: `selectFormSettings`, `addStep`, `addSection`, `addField`, `treeDrop`, `treeClick`, `treeExpand`, menus contextuels (step/section/field/root), `quickAdd`, `jsonChange`, `doImport`, `doExport`.
  - inspector-panel.component.{ts,html}
    - Inspecteur des propriétés (Step/Section/Field/Form Settings) + modales (options/conditions/styles).
    - Input: `selected`, `formGroup` (inspector), `hasSections`.
    - Outputs: actions « ouvrir builder », « personnaliser ».
  - preview-frame.component.{ts,html}
    - Encapsule `<app-dynamic-form>` et expose `(edit*)` vers le builder.
    - Inputs: `schema`, `editMode`, `selected*`, `forceBp`, `simValues`.
    - Output: relaye les événements d’édition (move/delete/select/add).
- services/
  - builder-tree.service.ts [OK]
    - Génère/résout les clés des nodes; applique les drops avec règles (root/step/section); garde « anti-self-drop » et cas « section vide ».
  - builder-customize.service.ts [OK]
    - Construit les `FormGroup` des dialogues de personnalisation et applique au schéma.
  - builder-issues.service.ts [NOUVEAU — EN PLACE]
    - Calcule la liste des problèmes (blockers/errors/warnings): clés dupliquées, références invalides; l’interdiction d’inline est gérée au niveau composant (dépend de l’inspector).

## Règles DnD (tree)

- Steps présents: items (fields/sections) ne vont que dans un step ou dans une section; pas à la racine.
- Sans steps: items autorisés à la racine ou dans une section.
- Réordonner dans le même parent et déplacer entre parents.
- Garde: interdire de déposer un élément dans lui‑même ou un descendant.
- Cas section vide: un drop sur une section sans enfants est traité « à l’intérieur » (insertIndex=0), même si le tree remonte `dropToGap`.

## Sélection & navigation

- Cliquer un step dans l’arbre sélectionne l’objet ET synchronise l’index courant de l’aperçu (`DynamicForm.go(i, true)`), en mappant l’étape réelle vers `visibleSteps`.
- Sélection d’un field/section garde `selectedField` aligné pour le surlignage dans l’aperçu.

## Palette (contexte)

- Boutons désactivés quand le contexte est invalide:
  - `+Section`, `+Field` en mode steps: nécessitent une sélection (step ou section).
  - En flat mode (sans steps): toujours autorisés.
- Palette rapide (Text/Number/…): même règle; ajoute dans la section/step sélectionné sinon racine (flat).

## Inspecteur (règles UI)

- Inline désactivé si des sections existent (tooltip + auto‑revert vers horizontal).
- `labelAlign` visible seulement horizontal/inline; `labelsOnTop` seulement horizontal; vertical force `labelsOnTop=true`.
- Conditions regroupées (« Condition ») et builder dédié (visibleIf/requiredIf/disabledIf).

## Styles & Espacements

- Éditeur d’espacement réutilisable (margin/padding) pour Section/Field/Form.
- Boutons d’actions au niveau form et par step (prev/next) avec styles.
- Label de field via variables CSS et `!important` pour override NG Zorro.

## Étapes suivantes (refactor)

- Extraire: inspector-panel, preview-frame (découplage TS/HTML).
- Finaliser l’extraction des validations dans `builder-issues.service.ts` (helpers internes restants à supprimer si non utilisés).
- Ajouter une registry déclarative pour la personnalisation (clé → propriétés configurables), afin de générer le form automatiquement.

Notes: ce document sert de guide pour le découpage; les services existants (tree/customize) sont déjà utilisés par le builder. Le refactor peut être réalisé par itérations pour minimiser le risque.
