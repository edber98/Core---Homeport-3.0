Dynamic Form — Sections en mode array (spec et exemples)

But
- Utiliser des sections avec `mode: "array"` pour lister des éléments (au lieu de `type: 'array'`).
- Compatible avec le Form Builder (édition/preview OK) et le Viewer.

Structure attendue
{
  "title": "Titre",
  "ui": { "layout": "vertical", "labelsOnTop": true },
  "fields": [
    {
      "type": "section",
      "title": "Section (Array)",
      "mode": "array",
      "key": "items",
      "array": { "initialItems": 0, "minItems": 0 },
      "fields": [
        { "type": "text", "key": "field1", "label": "Texte", "col": { "xs": 24 }, "expression": { "allow": true } },
        { "type": "textarea", "key": "field2", "label": "Zone", "col": { "xs": 24 }, "expression": { "allow": true } }
      ],
      "col": { "xs": 24 }
    }
  ]
}

Conseils
- `key` de la section = clé du tableau dans l’objet (ex: `tasks`, `projects`, `messages`).
- Mettre `col: { xs: 24 }` sur la section et les champs pour éviter les surprises de layout.
- L’importeur active `expression.allow` par défaut pour tous les champs.

Exemples intégrés
- OpenProject
  - `op_projects`: section array `projects` avec `id`, `name`, `identifier`, `status`, `description`.
  - `op_tasks`: section array `tasks` avec `id`, `subject`, `description`, etc.
  - `op_users`: section array `users` avec `id`, `name`, `email`, `login`.
- Email
  - `email_messages`: section array `messages` (messageId, from, to, subject, text).
  - `email_labels`: section array `labels` (un champ text `label`).

Migration depuis l’ancien format
- Ancien: `{ type: 'array', key: 'items', item: { type: 'section', fields: [...] } }`
- Nouveau: `{ type: 'section', mode: 'array', key: 'items', array: {...}, fields: [...] }`

