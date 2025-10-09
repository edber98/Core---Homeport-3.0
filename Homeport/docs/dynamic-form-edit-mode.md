# DynamicForm – Mode édition

Le composant `app-dynamic-form` supporte un mode édition permettant d’afficher les champs réels et, par-dessus, des actions d’édition (sélection, monter/descendre, supprimer).

## Inputs
- `schema: FormSchema` (requis): schéma du formulaire.
- `value?: Record<string, any>`: valeurs initiales (optionnel).
- `editMode: boolean` (défaut: `false`): active l’overlay d’édition.
- `selectedField?: FieldConfig | null`: champ actuellement sélectionné (pour surligner).
- `editAllowMove: boolean` (défaut: `true`): autorise les actions Monter/Descendre.
- `editAllowDelete: boolean` (défaut: `true`): autorise la suppression.

## Outputs
- `editMoveField`: `{ path: 'flat'|'section'|'stepRoot'; stepIndex?: number; sectionIndex?: number; index: number; dir: 'up'|'down' }`
  - Émis quand l’utilisateur clique ▲/▼. Le parent doit réordonner le tableau ciblé (ex: `moveItemInArray`).
- `editDeleteField`: `{ path: 'flat'|'section'|'stepRoot'; stepIndex?: number; sectionIndex?: number; index: number }`
  - Émis quand l’utilisateur clique ✕. Le parent doit supprimer l’élément à l’index donné.
- `editSelectField`: `{ path: 'flat'|'section'|'stepRoot'; stepIndex?: number; sectionIndex?: number; index: number; field: FieldConfig }`
  - Émis quand l’utilisateur clique sur un champ; typiquement utilisé pour ouvrir l’inspector côté parent.

## Surbrillance & hover
- Le champ passé dans `selectedField` reçoit la classe `df-edit-selected` (voir styles dans `components/sections/sections.scss`).
- Au survol, une bordure pointillée apparaît quand `editMode` est actif.

## Intégration typique
```
<app-dynamic-form
  [schema]="schema"
  [editMode]="true"
  [selectedField]="selectedField"
  (editMoveField)="onEditMoveField($event)"
  (editDeleteField)="onEditDeleteField($event)"
  (editSelectField)="onEditSelectField($event)"
></app-dynamic-form>
```

Le parent met à jour `schema` (références immuables) et gère la sélection/inspector.

## Notes
- Le composant reconstruit automatiquement le `FormGroup` quand `schema` change.
- Les règles de visibilité/disabled/required continuent de s’appliquer en temps réel en mode édition.
