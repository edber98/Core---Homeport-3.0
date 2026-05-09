# Dynamic output schema (`output_schema_field` + `output_schema_merge_at`)

Pour les nodes dont la **structure de sortie dépend d'un choix utilisateur** (extract IA, déclencheur HTTP avec payload custom, etc.), le schéma de sortie n'est pas figé dans le manifest — il est lu depuis un field du formulaire au moment où l'utilisateur configure le node.

## Trois modes possibles

### 1. Schéma 100 % statique (cas par défaut)

```json
{
  "outputHandles": [
    { "id": "ok", "name": "Success", "type": "payload", "schema": "$var:my_static_shape" }
  ]
}
```

Aucun champ dynamique. Le schéma est fixé une fois pour toutes.

---

### 2. Replace : le user définit la totalité du schéma

```json
{
  "output_schema_field": "extraction_schema",
  "outputHandles": [
    { "id": "ok", "name": "Success", "type": "payload", "schema": "$var:default_shape_si_pas_rempli" }
  ],
  "args": {
    "fields": [
      { "type": "schema_builder", "key": "extraction_schema", "label": "Schéma à extraire" }
    ]
  }
}
```

Quand l'utilisateur remplit `extraction_schema` (via le `schema_builder`), **le schéma dynamique remplace entièrement** le schéma statique. Si vide, fallback sur le schéma statique. Cas typique : extract IA, classify.

---

### 3. Merge : on garde un wrapper statique et on injecte le dynamique dedans

```json
{
  "output_schema_field": "payload_schema",
  "output_schema_merge_at": "body",
  "outputHandles": [
    { "id": "ok", "name": "Success", "type": "payload", "schema": "$var:http_incoming" }
  ],
  "args": {
    "fields": [
      { "type": "schema_builder", "key": "payload_schema", "label": "Structure du body" }
    ]
  }
}
```

Le schéma statique `$var:http_incoming` ressemble à :
```js
{ fields: [
  { key: "method",  type: "text" },
  { key: "headers", type: "json" },
  { key: "query",   type: "json" },
  { key: "body",    type: "json" }
] }
```

Avec `output_schema_merge_at: "body"`, le contenu du `schema_builder` (les fields définis par l'user) **remplace les sub-fields du field `body`**, qui devient automatiquement de type `section`. Résultat final :

```js
{ fields: [
  { key: "method",  type: "text" },
  { key: "headers", type: "json" },
  { key: "query",   type: "json" },
  { key: "body",    type: "section", fields: [
    { key: "userId",  type: "number" },  // ← ce que l'user a défini
    { key: "comment", type: "text" }
  ] }
] }
```

L'utilisateur peut désormais drag-drop `payload.body.userId` dans les nodes en aval.

Cas typique : déclencheur HTTP entrant (`core_webhook`).

---

## Implémentation

- **Helper centralisé** : `API/src/utils/output-schema.js` (`resolveOutputSchema(tpl, context, staticSchema)`)
- **Mirror frontend** : `Homeport/src/app/features/flow/output-schema.util.ts`
- **Toujours utiliser le helper** dans tout nouveau code qui résout un schéma — ne pas dupliquer la logique replace/merge.
- Le field `output_schema_merge_at` est inclus dans `checksumFeature` (importer.js + validate.js). Tout changement invalide les flows existants — comportement standard du système de checksum.

## Quand utiliser quel mode

| Cas | Mode |
|---|---|
| Schéma fixe, identique pour toutes les instances | Statique |
| L'user définit un objet pour de l'extraction/classification | Replace |
| Un wrapper backend (URL info, métadonnées HTTP) + un payload utilisateur custom | Merge |
| Tu te demandes "où va le user remplir ?" → `schema_builder` dans `args.fields` | Replace ou Merge |
