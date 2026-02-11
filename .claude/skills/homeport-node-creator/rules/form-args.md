# Formulaires dynamiques (args)

Le champ `args` d'un node template definit le formulaire de configuration visible dans l'inspecteur du flow editor.

## Structure racine

```json
"args": {
  "title": "Titre du formulaire",
  "ui": {
    "layout": "vertical",           // "vertical" ou "horizontal"
    "labelsOnTop": true              // Labels au-dessus des champs
  },
  "fields": [ ... ]                  // Liste des champs
}
```

## Types de champs

### text - Champ texte

```json
{
  "type": "text",
  "key": "url",                        // REQUIS - cle dans node.args
  "label": "URL",                      // Label affiche
  "description": "Adresse de la requete", // Texte d'aide
  "col": { "xs": 24, "sm": 24, "md": 12 }, // Grille responsive (24 = pleine largeur)
  "default": "",                       // Valeur par defaut
  "secret": false,                     // Masquer la valeur (pour passwords/tokens)
  "expression": { "allow": true },     // Autoriser les expressions {{ }}
  "validators": [
    { "type": "required" },            // Champ obligatoire
    { "type": "email" },               // Validation email
    { "type": "pattern", "pattern": "^https?://" }  // Regex
  ]
}
```

### textarea - Zone de texte multiligne

```json
{
  "type": "textarea",
  "key": "body",
  "label": "Corps (JSON)",
  "description": "Corps de la requete au format JSON.",
  "col": { "xs": 24 },
  "default": "{}",
  "expression": { "allow": true }
}
```

### number - Champ numerique

```json
{
  "type": "number",
  "key": "temperature",
  "label": "Temperature",
  "description": "Creativite de la generation (0-2).",
  "col": { "xs": 24 },
  "default": 0.7,
  "expression": { "allow": true }
}
```

### checkbox - Case a cocher

```json
{
  "type": "checkbox",
  "key": "smtpSecure",
  "label": "TLS active",
  "description": "Utiliser une connexion securisee.",
  "col": { "xs": 24 },
  "default": true
}
```

### select - Liste deroulante

```json
{
  "type": "select",
  "key": "method",
  "label": "Methode HTTP",
  "description": "Methode HTTP a utiliser.",
  "options": [
    { "label": "GET", "value": "GET" },
    { "label": "POST", "value": "POST" },
    { "label": "PUT", "value": "PUT" },
    { "label": "PATCH", "value": "PATCH" },
    { "label": "DELETE", "value": "DELETE" }
  ],
  "default": "GET",
  "col": { "xs": 24 },
  "expression": { "allow": true }
}
```

### section - Section groupante (objet ou tableau)

Permet de grouper des champs. En mode `array`, permet de definir des listes dynamiques.

**Mode objet (simple groupe):**
```json
{
  "type": "section",
  "title": "Configuration avancee",
  "key": "advanced",
  "fields": [
    { "type": "text", "key": "timeout", "label": "Timeout" },
    { "type": "checkbox", "key": "retry", "label": "Retry" }
  ],
  "col": { "xs": 24 }
}
```

**Mode array (liste dynamique) - essentiel pour les conditions:**
```json
{
  "type": "section",
  "title": "Branches",
  "description": "Definissez les branches et leurs conditions.",
  "key": "items",
  "mode": "array",
  "array": {
    "initialItems": 1,
    "minItems": 0,
    "maxItems": 10,
    "controls": {
      "add": { "kind": "text", "text": "Ajouter" },
      "remove": { "kind": "text", "text": "Supprimer" }
    }
  },
  "fields": [
    { "type": "text", "key": "name", "label": "Nom", "validators": [{"type":"required"}] },
    { "type": "text", "key": "condition", "label": "Condition", "expression": { "allow": true } }
  ],
  "col": { "xs": 24 },
  "grid": { "gutter": 16 },
  "ui": { "layout": "vertical" }
}
```

### array - Tableau simple d'elements

```json
{
  "type": "array",
  "key": "images",
  "label": "Images",
  "col": { "xs": 24 },
  "item": {
    "type": "section",
    "key": "_",
    "label": "Image",
    "fields": [
      { "type": "text", "key": "url", "label": "URL" },
      { "type": "textarea", "key": "b64", "label": "Base64" }
    ]
  }
}
```

### file - Upload de fichier

```json
{
  "type": "file",
  "key": "file",
  "label": "Fichier",
  "col": { "xs": 24 },
  "description": "Fichier a televerser.",
  "file": {
    "accept": "",                    // Types MIME / extensions (ex: ".pdf,.docx,image/*")
    "maxSize": 104857600,            // Taille max en bytes (100 MB)
    "multiple": false,               // Plusieurs fichiers
    "maxCount": 10,                  // Max fichiers si multiple
    "lifecycle": "execution",        // "temp" | "execution" | "permanent"
    "listType": "text",              // "text" | "picture" | "picture-card"
    "buttonText": "Choisir un fichier",
    "hint": "Televerser un fichier ou utiliser une expression"
  }
}
```

**Mode valeur (Val)**: Affiche un bouton upload. Produit un objet `fileRef`:
```json
{ "_type": "fileRef", "fileId": "file_xxx", "name": "doc.pdf", "mimeType": "application/pdf", "size": 12345 }
```

**Mode expression (Expr)**: L'utilisateur tape une URL (`https://...`) ou une injection (`{{ msg.nodeId.file }}`).
Le moteur evalue l'expression et passe le resultat au handler.

**Dans le handler**: Utiliser `opts.files.resolve(inputs.file)` pour obtenir un stream, ou `opts.files.resolveAsBuffer(inputs.file)` pour un Buffer. Ces methodes gerent a la fois les fileRef (upload) et les URL (expression).

**Note**: L'importer active automatiquement les expressions sur les champs file avec `defaultMode: "val"` (le mode upload est le defaut, l'utilisateur peut basculer en mode expression).

### textblock - Texte statique informatif

```json
{
  "type": "textblock",
  "label": "Note: Ce champ est calcule automatiquement."
}
```

## Visibilite conditionnelle

Affiche un champ uniquement si un autre champ a une certaine valeur:

```json
{
  "type": "textarea",
  "key": "body",
  "label": "Body (JSON)",
  "visibleIf": { "method": ["POST", "PUT", "PATCH"] }
}
```

Le champ `body` n'apparait que si `method` vaut POST, PUT ou PATCH.

## Expressions

Les expressions permettent d'utiliser des valeurs dynamiques dans les champs:

```json
{
  "type": "text",
  "key": "prompt",
  "expression": { "allow": true, "defaultMode": "expr" }
}
```

L'utilisateur peut alors ecrire `{{ msg.payload.text }}` ou `{{ start_form_xxx.email }}`.

**Note**: L'importer active automatiquement les expressions sur tous les champs (sauf `textblock`), donc il n'est pas strictement necessaire de le declarer dans le manifest. Mais c'est une bonne pratique de le faire explicitement.

## Grille responsive (col)

Le systeme utilise une grille de 24 colonnes:

```json
"col": {
  "xs": 24,    // Mobile: pleine largeur
  "sm": 24,    // Tablette: pleine largeur
  "md": 12,    // Desktop: demi-largeur
  "lg": 8,     // Grand ecran: tiers
  "xl": 8      // Tres grand ecran: tiers
}
```

- `24` = pleine largeur
- `12` = demi-largeur
- `8` = tiers de largeur

## Validators supportes

```json
"validators": [
  { "type": "required" },                          // Obligatoire
  { "type": "email" },                              // Format email
  { "type": "pattern", "pattern": "^[a-z]+$" },    // Regex
  { "type": "minLength", "minLength": 3 },          // Longueur min
  { "type": "maxLength", "maxLength": 100 }          // Longueur max
]
```
