# Expression Editor — Guide d’utilisation et d’intégration

Ce document explique le fonctionnement de l’éditeur d’expression utilisé dans le projet, sa syntaxe, le modèle de données (chemins), le moteur d’évaluation/aperçu, ainsi que son intégration avec DynamicForm et le Form Builder.

## Vue d’ensemble

- Composant: `src/app/modules/expression-editor/expression-editor.ts`
- Rôle: édition de templates avec îlots `{{ ... }}` et autocomplétion basée sur un contexte.
- Écosystème:
  - CodeMirror 6 pour l’édition (surlignage, menu de suggestion, DnD).
  - `ExpressionSandboxService` pour évaluer le template et indiquer les erreurs.
  - Aperçu intégré en dessous de l’éditeur (optionnel, contrôlé par props).
  - Intégration dans DynamicForm via le toggle « Val / Expr » des champs.

## Syntaxe des expressions

- Un « îlot » d’expression est délimité par `{{` et `}}`.
- À l’intérieur d’un îlot, on écrit généralement un chemin vers une valeur du contexte (ex: `{{ json.user.name }}`).
- Plusieurs îlots peuvent coexister dans un même texte; le moteur assemble le rendu final.
- Un îlot « incomplet » (ex: `{{ json.user.`) est considéré comme « pending » et surligné en conséquence.

## Modèle de données (chemins)

- Le `context` est libre: passez n’importe quel objet JavaScript. L’autocomplétion et la navigation par chemin se basent uniquement sur les clés que vous fournissez.
- Accès aux champs par point: `person.firstName`
- Accès aux index de tableau: `people[0].email`
- Exemples de racines (non obligatoires):
  - `json` (ou `$json`) pour des données « métier »
  - `env` (ou `$env`) pour des variables d’environnement/config
  - `node` (ou `$node`) pour le contexte d’un nœud
  - `now` (ou `$now`) pour la date/heure courante
- Selon votre intégration, vous pouvez fournir des alias (ex: proposer à la fois `json` et `$json`). Ce ne sont que des conventions; rien n’est imposé par l’éditeur.

## Méthodes/utilitaires suggérés

L’éditeur propose quelques « méthodes » utilitaires dans le menu (liste non exhaustive, selon implémentation):

- `keys(value)`
- `values(value)`
- `isEmpty(value)`
- `hasField(obj, key)`

Ces helpers sont suggérés pour guider l’utilisateur; le support effectif dépend du `ExpressionSandboxService`.

## Moteur d’évaluation et aperçu

- Service: `ExpressionSandboxService` (utilisé via `evaluateTemplateDetailed`)
  - Retourne `{ text: string, errors: Array<{ message: string, … }> }`.
  - Sert à obtenir l’aperçu « rendu » et la liste d’erreurs.
- L’éditeur calcule un « preview » automatique sur chaque changement de valeur ou de contexte (sauf si désactivé), avec contrôle fin de l’affichage des erreurs.
- Déroulé du preview:
  1) Si l’entrée entière est un seul îlot `{{ ... }}`, on évalue l’expression et on stringifie le résultat (objets → JSON).
  2) Sinon, on remplace chaque îlot par son rendu et on conserve le texte hors îlots tel quel.
  3) En cas d’erreur sur un îlot, l’aperçu conserve le texte brut `{{ ... }}` de l’îlot fautif et enregistre l’erreur pour l’affichage conditionnel.
- `showPreviewErrors`: quand `true`, l’aperçu ajoute une section “Errors:” listant les erreurs détectées; quand `false`, seul le rendu est affiché (le surlignage dans l’éditeur reste actif).
- Surlignage (décorations CodeMirror):
  - `.cm-expr`: îlot valide
  - `.cm-expr-valid`: îlot validé (mode « errorMode » activé)
  - `.cm-expr-invalid`: îlot invalide (erreur de validation/sandbox)
  - `.cm-expr-pending`: îlot incomplet

## API du composant

Entrées principales:

- `value: string` — texte/expressions à éditer (ControlValueAccessor supporté)
- `context: Record<string, any>` — données pour l’autocomplétion + rendu
- `inline: boolean` (défaut: true) — style compact
- `showPreview: boolean` (défaut: true) — afficher le panneau d’aperçu
- `showPreviewErrors: boolean` (défaut: true) — afficher/masquer les messages d’erreurs dans l’aperçu (le surlignage reste actif)
- `showFormulaAction: boolean` (défaut: true) — bouton d’ouverture d’un éditeur externe (optionnel)
- `errorMode: boolean` — mode visuel distinct pour les îlots valides

Événements:

- `valueChange: string` — nouvelle valeur texte (quand l’utilisateur modifie)
- `formulaClick` — clic sur l’icône/bouton formule (si affiché)

ControlValueAccessor:

- Le composant implémente `writeValue`, `registerOnChange`, etc., pour s’intégrer à Reactive Forms.
- Au `writeValue`, le preview est recalculé immédiatement pour refléter une valeur injectée.

## Interaction & UX

Autocomplétion et menu:

- Ouvre automatiquement dans un îlot `{{ … }}` et suggère les racines/chemins selon le `context`.
- Navigation: flèches ↑/↓, `Tab`/`Enter` pour valider, `Esc` pour fermer.
- `Ctrl/⌘ + Espace`: ouvrir/fermer manuellement le menu de suggestion.

Drag & Drop de tags:

- Accepte des éléments avec `dataTransfer` type `application/x-expression-tag` (payload JSON `{ path: string, name?: string }`) ou `text/plain`.
- Dépôt dans un îlot: insère `path` au caret.
- Dépôt hors îlot: entoure le token courant avec `{{ path }}`.

Normalisation à la frappe:

- Quand l’utilisateur tape `}}`, l’éditeur normalise localement le texte autour de la fermeture de l’îlot.

## Intégration dans DynamicForm

Toggle Val/Expr par champ (Fields):

- Si `field.expression?.allow === true`, le champ affiche un sélecteur « Val | Expr ».
- Auto-bascule en mode « Expr » si une valeur injectée contient un îlot `{{ … }}`.

Contrôle des erreurs d’aperçu:

- Global (form preview): `app-dynamic-form [exprPreviewShowErrors]`
- Par champ: `field.expression.showPreviewErrors` (si `false`, masque les erreurs pour ce champ dans l’aperçu)
- Calcul final côté champ: `finalShow = exprPreviewShowErrors && field.expression.showPreviewErrors !== false`
- Le `ctx` passé à `app-dynamic-form` peut être n’importe quel objet; choisissez les racines/structures les plus parlantes pour votre cas d’usage.

Propagation & debounce (dialogue avancé):

- Dans le Flow (dialog), pour éviter la sauvegarde à chaque caractère, les `valueChange` du formulaire sont coalescés (≈400 ms) et flush à la fin (pointerup/submit). L’éditeur d’expression reste fluide et le preview local suit les frappes, mais la persistance/historique se fait par « burst ».

## Bonnes pratiques & cas limites

- Toujours fournir un `context` cohérent avec les chemins que vous attendez. Les racines du contexte pilotent l’autocomplétion.
- Les erreurs d’îlots n’empêchent pas l’édition; l’utilisateur est guidé par le surlignage et le panneau d’aperçu.
- Si vous souhaitez désactiver entièrement l’aperçu (performance), utilisez `showPreview=false`.
- Pour éviter un effet « lettre par lettre » sur la sauvegarde côté host, appliquez un debounce côté parent sur `valueChange` (comme dans le Flow Advanced Editor).

## Opérateurs et ternaires (expressions avancées)

L’îlot `{{ ... }}` contient une expression JavaScript « sûre » (voir garde de sécurité ci‑dessous). Les opérateurs standard d’expression sont supportés, dont le ternaire `cond ? a : b`.

Exemples:

```text
Bonjour {{ json.user ? json.user.firstName : 'invité' }} !

Montant TTC: {{ (json.total ?? 0) * 1.20 }} €

Statut: {{ json.paid ? 'Payé' : (json.due > 0 ? 'En attente' : 'N/A') }}
```

Notes:

- Les opérateurs usuels (`+ - * / %`, comparaisons, `&&`/`||`, `!`, ternaire) sont utilisables.
- L’opérateur de coalescence `??` et l’accès aux tableaux/objets sont autorisés.
- Les appels à `new Date(...)`, `Math.*`, `JSON.*`, `String/Number/Boolean/Array/Object` sont disponibles via un jeu de « builtins » sûrs.

Garde de sécurité (extraits):

- Uniquement des expressions: pas de `;`, pas de `function`, `class`, `for/while`, `try/catch`, `import/export`, `await/yield`.
- `new` est autorisé seulement pour `Date(...)`.
- Accès explicitement interdits: `window`, `document`, `globalThis`, `Function`, `eval`, `XMLHttpRequest`, `fetch`, `WebSocket`, etc.
- Aucune affectation libre (`=`) n’est autorisée dans l’îlot.

## Exemples

Chemins simples:

```text
Bonjour {{ json.user.firstName }} {{ json.user.lastName }} !
```

Avec tableau et index:

```text
Premier email: {{ json.users[0].email }}
```

Plusieurs îlots:

```text
Commande #{{ json.order.id }} du {{ json.order.date }}
```

Tag DnD en dehors d’un îlot: insèrera automatiquement `{{ path }}` autour du token.

## Personnalisation visuelle (thème)

- Les classes CodeMirror appliquées aux îlots permettent un theming fin:
  - `.cm-expr`, `.cm-expr-valid`, `.cm-expr-invalid`, `.cm-expr-pending`.
- Le panneau d’aperçu (`.expr-preview`) affiche le rendu du template, plus éventuellement la section « Errors: … » si `showPreviewErrors` est true et que des erreurs existent.

## Sécurité

- L’évaluation passe par un service de sandbox. Évitez d’exposer dans `context` des objets sensibles ou des fonctions non désirées.
- Ne loggez pas de données sensibles provenant d’expressions utilisateur.

## Fichiers liés

- Composant: `src/app/modules/expression-editor/expression-editor.ts` (HTML/SCSS associés)
- Intégration champs: `src/app/modules/dynamic-form/components/fields/fields.*`
- DynamicForm: `src/app/modules/dynamic-form/dynamic-form.*`
- Flow advanced editor: `src/app/features/flow/advanced-editor/*`
