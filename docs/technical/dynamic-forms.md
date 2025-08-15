# Dynamic Forms — Validateurs, requiredIf, Résolution Runtime

Ce document décrit la modélisation des validateurs, la priorité de `requiredIf` sur `required`, et la manière de résoudre un formulaire (état final des champs) côté backend.

## 1. Modèle des Champs

`FormFieldBase`:
- `id: UUID`, `key: string`, `label: string`, `type: FieldType`
- `validators?: ValidatorSpec[]`
- `required?: boolean`
- `requiredIf?: string` (expression du langage maison)

`ValidatorSpec` supportés (base):
- `required`
- `minLength`, `maxLength`, `pattern`
- `min`, `max`, `integer`
- `dateMin`, `dateMax`

Extensions possibles: `email`, `url`, `minSelected`, `maxSelected`.

## 2. Évaluation de requiredIf

Principe: si `requiredIf` est défini, il supplante `required`.

Pseudo-code:
```ts
function isRequired(field, model, ctx) {
  if (field.requiredIf) return !!evalExpr(field.requiredIf, { form: model, ctx });
  return !!field.required;
}
```

Le rendu UI (étoile) et la validation doivent utiliser ce résultat.

## 3. Résolution du Formulaire

Entrées: `definition: FormDefinition`, `model?: any`, `ctx?: any`.
Sortie: `ResolvedForm` avec par champ: `{ required: boolean, visible?: boolean, enabled?: boolean, validators: RuntimeValidators }`.

Étapes:
1) Déterminer `required` par `isRequired`.
2) Construire la liste de validateurs runtime — si `requiredIf` est présent, retirer le validateur statique `required` de `validators`.
3) Générer un plan de validation stateless (ordre stable, pure).

## 3.1. Nouvel événement: valueCommitted

- `valueChange`: émis à chaque frappe/modif (live), inchangé.
- `valueCommitted` (nouveau): émis quand l’utilisateur «termine» une saisie.
  - Déclencheurs: blur/focusout sur le formulaire, et `submit()`.
  - Déduplication: n’émet pas si aucune valeur n’a changé depuis le dernier commit.
  - Usage recommandé: alimenter l’historique (undo/redo) et déclencher des sauvegardes côté hôte.

Exemple (Angular):
```
<app-dynamic-form
  [schema]="schema"
  [value]="model"
  (valueChange)="onLive($event)"
  (valueCommitted)="onCommit($event)">
</app-dynamic-form>
```

## 4. Ordre d’Évaluation des Validateurs

Recommandé:
1) `required` (dépend de `requiredIf`)
2) Type‑safety (ex. `integer`)
3) Bornes (`min`, `max`, `minLength`, `maxLength`)
4) Contrainte de format (`pattern`)

## 5. Erreurs & i18n

Code d’erreur stable par validateur (ex.: `required`, `minLength`, `pattern`). Les messages sont résolus côté client par dictionnaire i18n.

## 6. Exemples

Définition:
```json
{
  "id":"form-1",
  "name":"Inscription",
  "fields":[
    {"id":"f-email","key":"email","label":"Email","type":"text","validators":[{"type":"pattern","value":"^.+@.+$"}],"requiredIf":"$.form['newsletter'] == true"},
    {"id":"f-news","key":"newsletter","label":"Newsletter","type":"checkbox"}
  ]
}
```

Résolution (`model = { newsletter: true }`):
```json
{
  "fields": {
    "email": {"required": true, "validators": ["required", {"type":"pattern","value":"^.+@.+$"}]},
    "newsletter": {"required": false}
  }
}
```
