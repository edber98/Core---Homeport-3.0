# Providers

Un provider represente un service/integration (Slack, OpenAI, HTTP, etc.). Chaque node template est lie a un provider via `providerKey`.

## Structure complete

```json
{
  "key": "mon_provider",                // REQUIS - identifiant unique
  "name": "Mon Provider",               // REQUIS - nom affiche
  "title": "Mon Provider Title",        // Titre complet
  "order": 10,                          // Ordre d'affichage (plus petit = plus haut)
  "iconClass": "fa-solid fa-icon",      // Classe FontAwesome
  "iconUrl": "https://...",             // URL vers une icone (alternatif a iconClass)
  "color": "#hexcolor",                 // Couleur du provider
  "tags": ["tag1", "tag2"],             // Tags pour le filtrage
  "categories": ["Category"],           // Categories pour le catalogue
  "enabled": true,                      // Actif par defaut
  "hasCredentials": false,              // Necessite des credentials?
  "allowWithoutCredentials": false,     // Peut fonctionner sans credentials?
  "credentialsForm": { ... }            // Formulaire de credentials (si hasCredentials: true)
}
```

## Provider SANS credentials

```json
{
  "key": "http",
  "name": "HTTP",
  "title": "HTTP",
  "iconClass": "fa-solid fa-globe",
  "color": "#0ea5e9",
  "tags": ["http"],
  "hasCredentials": false
}
```

## Provider AVEC credentials

```json
{
  "key": "openai",
  "name": "OpenAI",
  "title": "OpenAI",
  "iconClass": "fa-brands fa-openai",
  "color": "#10A37F",
  "tags": ["ai", "llm"],
  "categories": ["AI"],
  "hasCredentials": true,
  "credentialsForm": {
    "title": "Identifiants OpenAI",
    "ui": { "layout": "vertical", "labelsOnTop": true },
    "fields": [
      {
        "type": "text",
        "key": "apiKey",
        "label": "API Key",
        "description": "Cle API OpenAI.",
        "col": { "xs": 24 },
        "secret": true,
        "validators": [{ "type": "required" }]
      },
      {
        "type": "text",
        "key": "baseUrl",
        "label": "Base URL (optionnel)",
        "description": "URL alternative de l'API.",
        "col": { "xs": 24 }
      },
      {
        "type": "text",
        "key": "defaultModel",
        "label": "Modele par defaut",
        "col": { "xs": 24 },
        "default": "gpt-4o-mini"
      }
    ]
  }
}
```

## Provider SMTP/IMAP (exemple complexe)

```json
{
  "key": "smtp_imap",
  "name": "Email SMTP/IMAP",
  "hasCredentials": true,
  "credentialsForm": {
    "title": "Configuration Email",
    "ui": { "layout": "vertical", "labelsOnTop": true },
    "fields": [
      { "type": "text", "key": "smtpHost", "label": "Serveur SMTP", "validators": [{"type":"required"}] },
      { "type": "number", "key": "smtpPort", "label": "Port SMTP", "default": 587 },
      { "type": "checkbox", "key": "smtpSecure", "label": "TLS SMTP", "default": true },
      { "type": "text", "key": "username", "label": "Utilisateur", "validators": [{"type":"required"}] },
      { "type": "text", "key": "password", "label": "Mot de passe", "secret": true, "validators": [{"type":"required"}] }
    ]
  }
}
```

## Provider AVEC plusieurs types d'authentification (visibleIf/requiredIf)

Quand un provider supporte plusieurs methodes d'authentification (ex: Token OU Login), utiliser un champ `select` pour le choix et des conditions `visibleIf`/`requiredIf` sur les champs dependants.

```json
{
  "key": "mon_provider",
  "name": "Mon Provider",
  "hasCredentials": true,
  "credentialsForm": {
    "title": "Identifiants Mon Provider",
    "ui": { "layout": "vertical", "labelsOnTop": true },
    "fields": [
      {
        "type": "select",
        "key": "type_auth",
        "label": "Type d'authentification",
        "col": { "xs": 24, "sm": 24, "md": 24, "lg": 24, "xl": 24 },
        "itemStyle": {
          "marginTop": "8px", "marginRight": "4px", "marginBottom": "8px", "marginLeft": "4px",
          "paddingTop": "4px", "paddingRight": "8px", "paddingBottom": "4px", "paddingLeft": "8px"
        },
        "options": [
          { "label": "Token (cle API)", "value": "token" },
          { "label": "Login (utilisateur / mot de passe)", "value": "login" }
        ],
        "default": "token",
        "expression": {
          "allow": true, "showPreviewErrors": true, "defaultMode": "val", "large": false,
          "showDialogAction": false, "dialogMode": "textarea", "autoHeight": false,
          "groupBefore": true, "showFormulaAction": true, "suggestionPlacement": "auto",
          "errorMode": false, "showPreview": true, "inline": true
        },
        "secret": false,
        "validators": [{ "type": "required" }]
      },
      {
        "type": "text",
        "key": "url",
        "label": "URL",
        "col": { "xs": 24, "sm": 24, "md": 24, "lg": 24, "xl": 24 },
        "validators": [{ "type": "required" }],
        "expression": {
          "allow": true, "showPreviewErrors": true, "defaultMode": "val", "large": false,
          "showDialogAction": false, "dialogMode": "textarea", "autoHeight": false,
          "groupBefore": true, "showFormulaAction": true, "suggestionPlacement": "auto",
          "errorMode": false, "showPreview": true, "inline": true
        },
        "secret": false, "default": ""
      },
      {
        "type": "text",
        "key": "apiKey",
        "label": "Cle API",
        "col": { "xs": 24, "sm": 24, "md": 24, "lg": 24, "xl": 24 },
        "secret": true,
        "validators": [{ "type": "required" }],
        "expression": {
          "allow": true, "showPreviewErrors": true, "defaultMode": "val", "large": false,
          "showDialogAction": false, "dialogMode": "textarea", "autoHeight": false,
          "groupBefore": true, "showFormulaAction": true, "suggestionPlacement": "auto",
          "errorMode": false, "showPreview": true, "inline": true
        },
        "default": "",
        "visibleIf": { "==": [{ "var": "type_auth" }, "token"] },
        "requiredIf": { "==": [{ "var": "type_auth" }, "token"] }
      },
      {
        "type": "text",
        "key": "username",
        "label": "Utilisateur",
        "col": { "xs": 24, "sm": 24, "md": 24, "lg": 24, "xl": 24 },
        "validators": [{ "type": "required" }],
        "expression": {
          "allow": true, "showPreviewErrors": true, "defaultMode": "val", "large": false,
          "showDialogAction": false, "dialogMode": "textarea", "autoHeight": false,
          "groupBefore": true, "showFormulaAction": true, "suggestionPlacement": "auto",
          "errorMode": false, "showPreview": true, "inline": true
        },
        "secret": false, "default": "",
        "visibleIf": { "==": [{ "var": "type_auth" }, "login"] },
        "requiredIf": { "==": [{ "var": "type_auth" }, "login"] }
      },
      {
        "type": "text",
        "key": "password",
        "label": "Mot de passe",
        "col": { "xs": 24, "sm": 24, "md": 24, "lg": 24, "xl": 24 },
        "secret": true,
        "validators": [],
        "expression": {
          "allow": true, "showPreviewErrors": true, "defaultMode": "val", "large": false,
          "showDialogAction": false, "dialogMode": "textarea", "autoHeight": false,
          "groupBefore": true, "showFormulaAction": true, "suggestionPlacement": "auto",
          "errorMode": false, "showPreview": true, "inline": true
        },
        "default": "",
        "visibleIf": { "==": [{ "var": "type_auth" }, "login"] },
        "requiredIf": { "==": [{ "var": "type_auth" }, "login"] }
      }
    ]
  }
}
```

### Regles visibleIf / requiredIf

- **`visibleIf`** : Le champ n'est affiche QUE si la condition est remplie
- **`requiredIf`** : Le champ est requis QUE si la condition est remplie
- Syntaxe JSON Logic : `{ "==": [{ "var": "nom_du_champ" }, "valeur_attendue"] }`
- Les deux se combinent : un champ cache n'est jamais requis
- Le champ `select` de choix doit avoir `"validators": [{ "type": "required" }]` (toujours requis)
- Les champs communs (ex: URL) qui sont toujours necessaires n'ont PAS besoin de visibleIf/requiredIf
- Dans le handler, verifier `opts.credentials.type_auth` pour adapter le comportement

### Dans le handler (utils.js)

```javascript
async function monApiCall(opts, ...) {
  const credentials = opts.credentials || {};
  const authType = credentials.type_auth || "token";

  if (authType === "token") {
    // Utiliser bearer token : Authorization: bearer ${credentials.apiKey}
  } else {
    // Utiliser login/password : session-based ou basic auth
  }
}
```

## Notes importantes

- Le champ `secret: true` masque la valeur dans l'UI (pour mots de passe, tokens, API keys)
- Les credentials sont chiffres en base et accessibles dans le handler via `opts.credentials`
- Si `allowWithoutCredentials: true`, le node peut s'executer meme sans credentials configures
- Un provider auto-cree est genere si `providerKey` dans un nodeTemplate reference un provider inexistant

## Modele Mongoose (Provider)

```javascript
{
  key: String,              // unique, indexed
  name: String,
  title: String,
  iconClass: String,
  iconUrl: String,
  color: String,
  tags: [String],
  categories: [String],
  order: Number,
  enabled: Boolean,
  hasCredentials: Boolean,
  allowWithoutCredentials: Boolean,
  credentialsForm: Mixed,   // Schema de formulaire
  checksum: String,
  repoId: ObjectId,
  repoName: String
}
```
