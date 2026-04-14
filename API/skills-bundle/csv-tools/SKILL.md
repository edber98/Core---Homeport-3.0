---
name: csv-tools
description: Transforme, filtre, agrège, joint des fichiers CSV via pandas (sortie CSV ou XLSX).
runtime: python
entrypoint: /app/skills-bundle/csv-tools/tools.py
version: 1.0.0
license: MIT
mimeType: text/csv
outputExt: csv
tools: [skill_execute]
tags: [csv, data, pandas, transform]
timeoutMs: 60000
requiresInput: true
---

# csv-tools — Manipuler des CSV avec pandas

## Quand utiliser
- Filtrer des lignes selon des conditions (égalité, comparaison, contient)
- Sélectionner / renommer des colonnes
- Agréger (group by + sum/mean/count/min/max)
- Joindre (inner/left/right/outer) deux CSV sur une clé
- Convertir CSV en XLSX
- Nettoyer (trim, dedup, drop NA)

Les fichiers source doivent être fournis dans `files:[{path, fileId}]`.

## Schéma d'entrée (stdin)
```json
{
  "action": "filter",
  "source": "data.csv",
  "separator": ",",
  "encoding": "utf-8",
  "outputName": "filtre",
  "outputFormat": "csv",

  "filter":  {"where": [{"column": "status", "op": "==", "value": "active"}]},
  "select":  {"columns": ["nom", "email", "date"]},
  "rename":  {"map": {"old_col": "new_col"}},
  "aggregate": {"groupBy": ["region"], "metrics": [{"column": "ca", "fn": "sum"}]},
  "join":    {"other": "autre.csv", "on": "id", "how": "left"},
  "sort":    {"by": ["date"], "ascending": false},
  "dedup":   {"columns": ["email"]},
  "dropna":  {"columns": ["email"]}
}
```

### Actions principales
Un `action` et autant d'options que tu veux. Actions possibles :
`filter`, `select`, `rename`, `aggregate`, `join`, `sort`, `dedup`, `dropna`, `convert`.

L'action détermine l'ordre d'application ; `convert` n'applique aucune transformation, uniquement un changement de format.

### Opérateurs de filtre
`==`, `!=`, `<`, `<=`, `>`, `>=`, `contains`, `in`, `notin`, `isnull`, `notnull`.

### Fonctions d'agrégation
`sum`, `mean`, `count`, `min`, `max`, `first`, `last`, `nunique`.

## Exemple — Filtrer + agréger
```json
{
  "action": "aggregate",
  "source": "ventes.csv",
  "filter":    {"where": [{"column": "region", "op": "==", "value": "FR"}]},
  "aggregate": {"groupBy": ["produit"], "metrics": [{"column": "montant", "fn": "sum"}]},
  "outputName": "ventes-fr-par-produit",
  "outputFormat": "xlsx"
}
```

## Limitations
- Taille input : 50 MB total (limite sandbox).
- Pas de SQL brut ; passe par les actions structurées.
- `outputFormat` : `csv` (défaut) ou `xlsx`.

## Troubleshooting
- `column_not_found:X` → colonne absente dans le CSV.
- `invalid_operator:X` → voir la liste ci-dessus.
- `pandas not installed` → vérifier Dockerfile.
