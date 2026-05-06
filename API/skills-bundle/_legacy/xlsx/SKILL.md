---
name: xlsx-create
description: Crée un classeur Excel (.xlsx) avec feuilles, headers stylés, formules, charts (bar/line/pie).
runtime: python
entrypoint: /app/skills-bundle/xlsx/create.py
version: 1.0.0
license: MIT
mimeType: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
outputExt: xlsx
tools: [skill_execute]
tags: [xlsx, excel, spreadsheet, data, charts]
timeoutMs: 60000
---

# xlsx-create — Créer un classeur Excel

## Quand utiliser
Quand il faut produire un `.xlsx` structuré : rapport tabulaire, extract de données, template financier, dashboard.

## Schéma d'entrée
```json
{
  "title": "Ventes",
  "sheets": [
    {
      "name": "Données",
      "headers": ["Produit", "Qté", "Prix"],
      "rows": [["A", 10, 2.5], ["B", 5, 4]],
      "columnWidths": [20, 10, 10],
      "styles": {
        "header": {"bold": true, "fillColor": "4472C4", "fontColor": "FFFFFF"},
        "alternateRows": {"fillColor": "F2F2F2"}
      },
      "freezeHeader": true,
      "formulas": [{"cell": "D2", "formula": "=B2*C2"}],
      "charts":   [{"type": "bar", "dataRange": "A1:C3", "title": "Ventes", "position": "E2"}]
    }
  ]
}
```

Types de charts : `bar`, `line`, `pie`.

## Exemples

### Exemple 1 — Tableau simple
```json
{
  "title": "Contacts",
  "sheets": [{
    "name": "Liste",
    "headers": ["Nom", "Email", "Téléphone"],
    "rows": [
      ["Alice", "alice@ex.com", "0601020304"],
      ["Bob",   "bob@ex.com",   "0605060708"]
    ],
    "freezeHeader": true
  }]
}
```

### Exemple 2 — Tableau + chart
```json
{
  "title": "Ventes Q1",
  "sheets": [{
    "name": "CA",
    "headers": ["Mois", "CA"],
    "rows": [["Jan", 120], ["Fév", 135], ["Mar", 148]],
    "charts": [{"type": "line", "dataRange": "A1:B4", "title": "CA Q1", "position": "D2"}]
  }]
}
```

## Limitations
- Un chart = un `dataRange` rectangulaire (pas de séries discontinues).
- Pas de macros VBA, pas de pivot tables.
- Styles limités à bold/italic/fillColor/fontColor (header et alternate rows).

## Troubleshooting
- `openpyxl not installed` → vérifier Dockerfile.
- `invalid_range` → format attendu `A1:C5`.
- `output_too_large` → limiter le nombre de lignes ou splitter en plusieurs feuilles.
