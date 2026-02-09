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
