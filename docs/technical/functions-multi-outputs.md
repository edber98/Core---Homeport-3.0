# Fonctions à Multiples Sorties & Sorties Dynamiques — Topo rapide

Ce mémo reflète le fonctionnement réel du Flow Builder (voir `src/app/features/flow/flow-builder.component.ts`) pour les nœuds «function» à sorties multiples et les sorties dynamiques (uniquement pour les conditions dans ce code).

## 1) Types de sorties (tel qu’implémenté)

- Sorties «function»: handles numériques en chaîne (`"0"`, `"1"`, …). Le libellé affiché provient de `template.output` (ex.: `['Succes', 'Created', 'Updated']`).
- Sortie d’erreur optionnelle: handle littéral `"err"` inséré en première position si `template.authorize_catch_error === true` ET `model.catch_error === true`.
- `start`: handle de sortie `"out"` (libellé affiché: `Succes`).
- Sorties dynamiques: dans ce code, seules les conditions exposent des sorties dynamiques (voir §3). Les fonctions n’ont PAS de sorties dynamiques dérivées des params.

## 2) Fonction — mapping handles → libellés

- Handles: `outputIds(model)` renvoie `['err', '0','1',...]` si catch activé, sinon `['0','1',...]`.
- Libellés: `getOutputName(model, idxOrId)` mappe les handles numériques vers `template.output[index]`.
  - Quand `err` est actif, l’index de base est décalé: `baseIndex = idx - 1`.
  - Si `template.output` n’est pas défini, on affiche `['Succes']` par défaut.
- Les étiquettes d’arête utilisent `computeEdgeLabel(sourceId, sourceHandle)` avec la même logique.

Exemple de template multi‑sorties (UI):
```json
{ "id":"tmpl_upsert", "type":"function", "authorize_catch_error": true, "output": ["Succes", "Created", "Updated"], "args": {} }
```

Exemples de handles retournés par `outputIds`:
- Catch OFF → `["0","1","2"]`
- Catch ON  → `["err","0","1","2"]`

## 3) Condition — sorties dynamiques et stabilité

- Pour un nœud `condition`, les handles des sorties correspondent aux items déclarés dans `model.context[tmpl.output_array_field || 'items']`.
  - Si un item possède un `_id`, ce `_id` est utilisé comme handle (recommandé).
  - Sinon, l’index (`"0"`, `"1"`, …) est utilisé.
- `ensureStableConditionIds(oldModel, model)`: préserve les `_id` par index puis par nom; génère un nouvel `_id` pour les nouveaux items.
- `outputIds(model)` inclut en plus les handles «déjà connectés» (collectés depuis `edges` du graphe) pour que les arêtes restent visibles même si l’item a été temporairement retiré.
- Suppression d’edges: côté UI, un edge en provenance d’un `condition` est conservé par défaut; il n’est supprimé que si l’item est réellement retiré (ou si son `id` figure dans `allowedRemovedEdgeIds`).
- Libellés de sorties condition: `getOutputName`/`computeEdgeLabel` utilisent `item.name` (ou l’index) et savent résoudre par index ou par `_id`.

## 4) Règles à respecter (alignées sur le code)

- Pour les fonctions:
  - Définir `template.output` comme un tableau de libellés; le nombre de libellés = nombre de sorties.
  - Les handles exposés sont numériques sous forme de chaîne; ne pas référencer `ok/created/...` côté edges, mais bien `"0","1",...`.
  - Activer `err` via `model.catch_error = true` uniquement si `template.authorize_catch_error = true`.
- Pour les conditions:
  - Toujours gérer des `_id` stables au niveau des items; ne supprimer des arêtes que quand l’item est supprimé.
  - L’UI conserve les arêtes connectées en incluant leurs handles dans `outputIds`.

## 5) Handler (rappel)

Un handler peut émettre vers un handle de sortie connu:
```ts
type Outputs = Iterable<[outputId: string, msg: Message]>;
// outputId ∈ { 'err'?, '0','1',... } (fonction) ou ∈ { items[i]._id | index } (condition)
```

Si `outputId` n’est pas reconnu, c’est une erreur de graph (comportement à définir selon le runtime).

## 6) Bonnes pratiques

- Garder `template.output` cohérent et limité (lisibilité < 6 sorties).
- Utiliser des `_id` pour les conditions afin d’éviter les ruptures d’arêtes lors des renommages/réordonnancements.
- Activer `catch_error` seulement pour les templates qui l’autorisent; le handle `err` est visuellement stylé comme erreur et propage l’état «error» aux nœuds visés.
