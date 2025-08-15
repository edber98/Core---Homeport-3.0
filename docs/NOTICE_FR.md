# Homeport — Notice technique complète (FR)

Ce document décrit en détail l’architecture, les composants, les données, et les liens entre les modules de l’application Homeport (Angular 20). Il sert de guide pour les développeurs: prise en main, intégration, extension, et maintenance.

## Sommaire
- Vue d’ensemble & arborescence
- Démarrage, build, tests
- Modules & fonctionnalités
  - Dynamic Form (construction de formulaires dynamiques)
  - Expression Editor (éditeur d’expressions type n8n)
  - JSON/Schema Viewer (visualisation & édition JSON)
  - Builder & outils (Monaco, inspectors)
  - Dashboard (pages d’exemples & intégrations)
- Données & contexte d’évaluation
- Liaisons et flux de données (DnD, ngModel, events)
- API de composants (Inputs/Outputs majeurs)
- Tests, style & bonnes pratiques
- Extensions & TODOs

---

## Vue d’ensemble & arborescence

- Source principale: `src/`
  - Entrée app: `src/main.ts`, racine `src/app/app.ts`
  - Routes: `src/app/app.routes.ts`
  - Features: `src/app/features/*` (ex: `dashboard`, `dynamic-form`, `builder`)
  - Modules réutilisables: `src/app/modules/*` (ex: `dynamic-form`, `expression-editor`, `json-schema-viewer`)
  - Layout/Pages: `src/app/layout/*`, `src/app/pages/*`
- Assets: `public/` (copiés dans `dist`)
- Configurations: `angular.json`, `tsconfig*.json`, `.editorconfig`
- Documentation: `docs/`

Arborescence notable:
- `src/app/modules/dynamic-form/*`: moteur de formulaires dynamiques (UI, service, conditions, rendering)
- `src/app/modules/expression-editor/*`: éditeur CodeMirror 6 avec autocomplétion, DnD, prévisualisation
- `src/app/modules/json-schema-viewer/*`: viewer/éditeur JSON (schema-tree + monaco en option)
- `src/app/features/dynamic-form/components/*`: composants builder (Monaco JSON, inspectors, panels)
- `src/app/features/dashboard/*`: pages de démonstration et compos intégrateurs

---

## Démarrage, build, tests

- Dev server: `npm start` (http://localhost:4200)
- Build prod: `npm run build` (sortie: `dist/Homeport`)
- Tests unitaires: `npm test` (Karma + Jasmine)
- Angular CLI: `ng serve`, `ng build --configuration development` pour builds locales rapides

---

## Modules & fonctionnalités

### 1) Dynamic Form (`src/app/modules/dynamic-form`)

Rôle: rendre des formulaires dynamiques basés sur un schéma JSON. Gère l’UI, la validation, les conditions (visibleIf, requiredIf, disabledIf), et un mode “expression” pour les champs.

Fichiers clés:
- `dynamic-form.ts/html/scss`: conteneur Standalone (rendu de la page formulaire à partir du schéma)
- `dynamic-form.service.ts`: logique de transformation, valeurs, validations, conditions
- `components/fields/*`: rendu de champs (text, select, radio, checkbox, textarea, number, date, blocs, sections…)

Schéma (extraits conceptuels):
- Racine: `{ title, ui, steps|sections|fields, summary?, actions? }`
- Champ: `{ key?, type, label?, col?, validators?, visibleIf?, requiredIf?, disabledIf?, options?, default? }`
- UI: `{ layout: 'horizontal'|'vertical'|'inline', labelCol, controlCol, labelsOnTop?, widthPx?, labelAlign? }`
- Conditions (JSON-logic style): `visibleIf|requiredIf|disabledIf` acceptent `all/any/{ '==': [{ var: 'fieldKey' }, value] }` etc.

Mode “Expression” par champ (intégration):
- Rendu conditionnel: champ standard ou `<app-expression-editor>` selon un toggle “Val/Expr” (nz-segmented) par champ
- Passage du contexte `[context]` à l’éditeur
- Maintien des `ControlValueAccessor` pour compatibilité avec Reactive/Template forms

### 2) Expression Editor (`src/app/modules/expression-editor`)

Rôle: éditeur inline de templates multi-îlots `{{ ... }}` avec autocomplétion contextuelle, evaluation sandbox, DnD depuis les tags/JSON.

Fonctions principales:
- Autocomplétion contextuelle dans `{{ ... }}` (segments, objets, arrays `[0]`)
- Clavier: Ctrl/Cmd+Espace pour ouvrir/fermer, ↑/↓ pour naviguer, Tab/Enter pour valider
- Suggestions “segment-only” (n’insère pas de point final automatiquement)
- Normalisation des espaces: `{{ expr }}`
- Prévisualisation live + coloration îlots (valide/invalide/pending)
- DnD: insert `path` si drop dans un îlot; sinon `{{ path }}`
- `ControlValueAccessor` compatible Angular forms

Entrées/Sorties:
- `@Input() context: Record<string,any>`: données et alias éventuels (ex: `{ payload, $env, $node, $now }`)
- `[(ngModel)]`: texte de l’expression
- `@Output() valueChange`: émission des changements

Évaluation & sécurité:
- Service: `expression-sandbox.service.ts`
  - `evaluateTemplateDetailed(text, ctx)`: rend le template avec capture d’erreurs par îlot
  - `isSafeExpression`, `isValidIsland`: filtrage de constructions interdites; sandbox minimal
  - Normalisation d’alias (compat json/$json si nécessaire)

### 3) JSON/Schema Viewer (`src/app/modules/json-schema-viewer`)

Rôle: visualiser un objet JSON en deux modes:
- Mode “Schema”: arbre pliable (objets/arrays), tags draggables pour insérer des chemins
- Mode “JSON”: pretty-print coloré; option d’édition via Monaco

En-tête sur deux lignes:
- Ligne 1: `title` (gras) + `subtitle` (gris, petit) à sa droite
- Ligne 2: segment (gauche), badge “Mode édition” (si JSON+édition), et à droite boutons: Formater (⤾), Minifier (⇣), Sauvegarder, Annuler, Quitter

Arbre (Schema):
- Nœuds compactes alignés, caret CSS, click sur caret ou tag replie/déplie
- Type à droite: `object` ou `array [n]` ou `string|number|boolean|null`
- Tag = “pill”: largeur fit-content, label en gras, icône type SVG à gauche
- DnD: `application/x-expression-tag` (JSON `{ path, name }`) + `text/plain`
- Persistance de l’expansion: map `expansion[fullPath]` (chemins ex: `payload.arr[0]`)

Mode JSON:
- Vue “lecture”: `<pre>` colorisé
- Mode édition (si activé): Monaco editor + actions (icônes en en-tête)
- Sauvegarde: parse JSON, met à jour `currentData`, émet `dataChange` et, si `[(ngModel)]`, propage via ControlValueAccessor

Inputs/Outputs majeurs:
- `[(ngModel)]`: données JSON (équivalent à `[(data)]`) — ControlValueAccessor inclus
- `@Input() mode?: 'Schema'|'JSON'` + `@Output() modeChange`
- `@Input() editable` (boolean), `[(editMode)]`
- `@Input() title?: string`, `@Input() subtitle?: string`
- `@Input() rootAlias?: string` (optionnel; non utilisé pour DnD si on veut des chemins “réels”)
- `@Output() dataChange: any`

### 4) Builder & outils (`src/app/features/dynamic-form/components`)

Rôle: inspection et édition des schémas/contexts dans une UI builder.
- `monaco-json-editor.component.ts`: wrapper Monaco (format/minify, validation JSON)
- Inspectors (section/step/field): affichage/édition de props form
- `context-panel.component.ts`: affichage et édition du contexte JSON

### 5) Dashboard (`src/app/features/dashboard`)

Rôle: démontrer l’intégration des modules (viewer, expression editor, dynamic-form).
- `pages/dashboard-home/*`: exemple d’assemblage viewer + éditeur d’expressions + formulaires

---

## Données & contexte d’évaluation

Contexte (`context`) passé à l’Expression Editor:
- Libre, dépend du parent: ex. `{ payload, $env: {}, $node: {}, $now: new Date() }`
- Aliases historiques (`json/$json`) gérés par le sandbox si nécessaire (pour compat). Par défaut, privilégier des chemins “réels” (ex: `payload.obj.name`).

Chemins DnD:
- Le viewer émet toujours le chemin intégral depuis la racine de l’objet reçu (ex: `payload.arr[0].code`).
- L’Expression Editor insert le chemin tel quel à l’intérieur d’un îlot ou le wrap en `{{ path }}` en dehors.

---

## Liaisons & flux de données

- `JSON/Schema Viewer` → `Expression Editor` (par DnD): insertion de chemins.
- `JSON/Schema Viewer` → parent (édition JSON): `dataChange` et/ou `[(ngModel)]` mettent à jour la source. Le parent peut répercuter sur `exprCtx`.
- `DynamicForm` ↔ `Expression Editor` (mode champ): toggle “Val/Expr” par champ; l’éditeur reçoit `[context]` du formulaire/parent.

---

## API de composants (principaux)

### JsonSchemaViewerComponent (`src/app/modules/json-schema-viewer/json-schema-viewer.ts`)
- `[(ngModel)]`: objet JSON (ControlValueAccessor)
- `@Input() mode?: 'Schema'|'JSON'` / `@Output() modeChange`
- `@Input() editable = true`
- `[(editMode)]`: booléen édition JSON
- `@Input() title?: string`, `@Input() subtitle?: string`
- `@Input() rootAlias?: string` (optionnel; n’impacte pas les chemins DnD si non voulu)
- `@Output() dataChange: any`

### ExpressionEditorComponent (`src/app/modules/expression-editor/expression-editor.ts`)
- `[(ngModel)]`: string (template)
- `@Input() context: Record<string,any>`
- `@Input() inline = true`, `@Input() showPreview = true`, `@Input() errorMode = false`
- `@Output() valueChange: string`

### MonacoJsonEditorComponent (`src/app/features/dynamic-form/components/monaco-json-editor.component.ts`)
- `[(value)]`: string JSON
- `@Input() height = 220`

### DynamicForm (container) (`src/app/modules/dynamic-form/dynamic-form.ts`)
- `@Input() schema: any`
- `@Input() value?: any`
- Événements de submit / reset selon implémentation service

---

## Tests, style & bonnes pratiques

- Tests: Karma + Jasmine
  - Exemple: `expression-sandbox.service.spec.ts`
- Style: `.editorconfig` + SCSS/LESS du projet; respecter Angular style guide
- Performance & UX:
  - Toujours utiliser `trackBy` dans les ngFor
  - Éviter les re-renders inutiles (persistance de l’expansion dans le viewer)
  - CodeMirror 6 configuré pour usage inline; scroll horizontal conservé
  - Monaco chargé via CDN (prévoir fallback offline si besoin)

---

## Extensions & TODOs

- Expression Editor
  - Support des clés avec espaces via notation bracket `obj['key with space']` dans l’autocomplétion
  - Ancrage/placement plus sophistiqué du popover d’auto-complétion

- JSON/Schema Viewer
  - Recherche/filtre de clés
  - Pagination/virtualisation pour grands tableaux
  - Palette d’icônes alternative, jeu d’icônes monochromes, ou import d’un librairie d’icônes

- Dynamic Form
  - Persistance du mode “Val/Expr” dans le schéma
  - Aperçu inline des expressions sur chaque champ

- Infrastructure
  - Hébergement local de Monaco pour CSP strictes (sans CDN)
  - Plus de specs unitaires (conditions form, rendering sections/steps)

---

## Prise en main rapide (exemple d’intégration)

1) Visualiser un JSON et DnD vers l’éditeur:
- `dashboard-home.html`:
  - `<app-json-schema-viewer [(ngModel)]="viewerData" title="Payload" subtitle="Dernière exécution"></app-json-schema-viewer>`
  - `<app-expression-editor [(ngModel)]="expr" [context]="{ payload: viewerData.payload, $now: new Date() }"></app-expression-editor>`

2) Activer l’édition JSON & sauvegarder:
- Passer en mode JSON → Éditer → Sauvegarder → `viewerData` est mis à jour & re-rendu

3) Formulaire dynamique avec expressions:
- Schéma: ajouter `{ expression: { allow: true } }` sur un champ pour activer le toggle “Val/Expr”
- Context: passer un objet `ctx` au formulaire et propagez vers l’`ExpressionEditorComponent`

