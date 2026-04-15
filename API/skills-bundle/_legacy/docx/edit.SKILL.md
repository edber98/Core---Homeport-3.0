---
name: docx-edit
description: Édite un document Word existant (remplacement de texte, ajout, insertion après un marqueur, changement de titre).
runtime: python
entrypoint: /app/skills-bundle/docx/edit.py
version: 1.0.0
license: MIT
mimeType: application/vnd.openxmlformats-officedocument.wordprocessingml.document
outputExt: docx
tools: [skill_execute]
tags: [docx, word, edit, template]
requiresInput: true
timeoutMs: 60000
---

# docx-edit — Modifier un document Word

## Quand utiliser
Quand l'utilisateur a déjà un `.docx` (template, modèle) et veut le personnaliser : remplacer des placeholders `{{name}}`, ajouter un paragraphe, insérer du contenu après un titre, etc.

## Entrée
Le fichier source doit être stagé via `files: [{path, fileId}]` — il sera disponible dans `/workspace/in/<sourceFileName>`.

```json
{
  "sourceFileName": "template.docx",
  "outputTitle": "rapport-edite",
  "edits": [
    {"action": "replace_text",     "query": "{{name}}",       "value": "Alice"},
    {"action": "append_paragraph", "value": "Ligne ajoutée",  "style": "Normal"},
    {"action": "insert_after",     "query": "Introduction",   "value": "Nouveau paragraphe"},
    {"action": "set_heading",      "query": "Ancien titre",   "value": "Nouveau titre", "level": 1}
  ]
}
```

## Actions supportées
- `replace_text` — remplace toutes les occurrences d'une chaîne.
- `append_paragraph` — ajoute un paragraphe à la fin.
- `insert_after` — insère un paragraphe après le premier qui contient `query`.
- `set_heading` — change le texte (et éventuellement le niveau) d'un titre.

## Exemple — Personnalisation d'un modèle
```json
{
  "sourceFileName": "contrat-type.docx",
  "outputTitle": "contrat-alice",
  "edits": [
    {"action": "replace_text", "query": "{{client_name}}", "value": "Alice Dupont"},
    {"action": "replace_text", "query": "{{date}}",        "value": "14 avril 2026"}
  ]
}
```

## Limitations
- Ne préserve pas les commentaires, suivi de modifications, macros.
- Les actions sont appliquées **dans l'ordre** — un `replace_text` sur un texte inséré précédemment est possible.
- `unknown_action` retourné si action hors whitelist.
