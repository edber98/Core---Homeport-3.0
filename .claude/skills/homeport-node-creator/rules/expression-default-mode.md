# Field `expression.defaultMode` : `'val'` vs `'expr'`

L'importer (`API/src/plugins/importer.js`, fonction `enableExpressionsOnSchema`) injecte automatiquement `expression: { allow: true, defaultMode, autoHeight: true }` sur **chaque field** d'un schema args, sauf `textblock` et `resolver`.

Le `defaultMode` détermine le mode initial de l'éditeur d'expression :
- `'expr'` → mode formule (`{{ var }}`, concaténation, code) ouvert par défaut
- `'val'` → mode valeur (saisie/choix direct) ouvert par défaut. L'expression reste ouvrable mais ce n'est pas le défaut.

## Règle automatique appliquée par l'importer

| Type de field | defaultMode |
|---|---|
| `text`, `textarea`, `number`, `email`, `tel`, `password` | `'expr'` |
| `code`, `expression`, `json`, `html`, `url` | `'expr'` |
| `select`, `radio`, `checkbox`, `date` | **`'val'`** |
| `cron`, `file`, `color`, `rate` | **`'val'`** |
| `schema_builder`, `tags` | **`'val'`** |
| `textblock` | (skipped, pas d'expression) |
| `resolver` | (skipped — valeur backend-driven) |

Logique : le mode `'expr'` n'a de sens que pour les types **texte libre** où l'utilisateur peut concaténer et interpoler. Les types structurés (case à cocher, sélection, calendrier, fichier, schéma JSON, cron) sont des UI où l'utilisateur **choisit/dépose** — l'expression est un cas d'usage rare. Les forcer en `'expr'` sème la confusion.

## Quand override-er dans le manifest

Tu peux toujours forcer manuellement :

```json
{
  "type": "checkbox",
  "key": "active",
  "expression": { "allow": true, "defaultMode": "expr" }
}
```

Cas légitimes :
- Une checkbox dont la valeur dépend d'une autre source (ex: `{{ payload.enabled }}`).
- Un select dont les options viennent d'une expression dynamique.

Sinon : laisse l'importer faire son travail. Pas besoin de spécifier `expression` dans le manifest pour le cas standard.

## Si tu écris un nouveau type custom (resolver, df-foobar, etc.)

Si ton type ne doit PAS avoir d'expression editor (ex: composant custom qui gère sa propre I/O), ajoute-le à la liste des types skippés dans `importer.js` (cf. `t !== 'resolver'` actuellement).

## Impact

Modifier la règle `defaultMode` change le `checksumArgs` de chaque template impacté → tous les flows existants tomberont en `template_args_changed` au prochain run, jusqu'à re-snapshot du templateObj (rouvrir + sauver chaque flow). Comportement attendu du système de checksum.
