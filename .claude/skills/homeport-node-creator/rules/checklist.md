# Checklist : Créer un nouveau node de A à Z

## RÈGLE OBLIGATOIRE : Accents français et majuscules

**TOUJOURS** écrire en français correct avec accents dans :
- `title`, `description`, `label`, `subtitle`, credentialsForm `title`
- Exemples corrects : "Créer un contact", "Récupérer un fichier", "Supprimer un élément"
- Exemples INCORRECTS : "Creer un contact", "Recuperer un fichier", "Creer Un Contact"

**Règles de majuscules** :
- Seulement le premier mot en majuscule + noms propres
- ✅ "Créer un contact" / "Lister les projets" / "Envoyer un message Slack"
- ❌ "Créer Un Contact" / "Lister Les Projets"

**Mots courants avec accents** :
- Créer, Récupérer, Supprimer, Télécharger, Déplacer, Général, Résultat
- Identifiants, Clé API, Paramètre, Données, Échéance, Référence
- Numéro, Téléphone, Adresse, Société, Catégorie, Priorité
- Éléments, Résumé, Événement, Déclencher, Précédent, Système

## Étape 1 : Décider où placer le plugin

- [ ] **Plugin existant?** Ajouter au manifest d'un plugin existant dans `API/src/plugins/local/` ou `repos/`
- [ ] **Nouveau plugin?** Creer un nouveau dossier:
  ```
  API/src/plugins/local/mon-plugin/
  ├── manifest.json
  └── functions/
      └── mon-handler.js
  ```

## Etape 2: Definir le provider (si nouveau)

- [ ] Ajouter dans `manifest.json` > `providers[]`:
  ```json
  {
    "key": "unique_key",
    "name": "Nom Affiche",
    "title": "Titre",
    "iconClass": "fa-solid fa-icon",
    "color": "#hexcolor",
    "tags": ["tag"],
    "hasCredentials": false
  }
  ```
- [ ] Si credentials necessaires: ajouter `"hasCredentials": true` + `"credentialsForm": { ... }`

## Etape 3: Definir le node template

- [ ] Ajouter dans `manifest.json` > `nodeTemplates[]`:
  - [ ] `key` unique (snake_case, prefixe par provider: `provider_action`)
  - [ ] `name` en camelCase
  - [ ] `schemaVersion: 2`
  - [ ] `type` et `nodeKind` (function, event, condition, loop, agent, memory, tool_ai)
  - [ ] `providerKey` correspondant au provider
  - [ ] `title`, `subtitle`, `description`, `icon`, `category`
  - [ ] `inputHandles` (sauf pour triggers: start, event)
  - [ ] `outputHandles` avec schemas si applicable
  - [ ] `linkedHandles` si agent
  - [ ] `args` avec le formulaire de configuration
  - [ ] `authorize_catch_error: true` si le node peut echouer

## Etape 4: Definir les variables (OBLIGATOIRE)

- [ ] **TOUJOURS** definir un schema de sortie pour chaque type de reponse dans `manifest.json` > `variables`:
  ```json
  "variables": {
    "mon_schema": {
      "title": "...",
      "fields": [
        { "type": "checkbox", "key": "ok", "label": "OK", "col": { "xs": 24 } },
        { "type": "number", "key": "status", "label": "Status HTTP", "col": { "xs": 24 } },
        { "type": "section", "title": "Data", "key": "data", "fields": [ ... ], "col": { "xs": 24 } }
      ]
    }
  }
  ```
- [ ] Pour les reponses tableau, utiliser `"mode": "array"` sur la section `data`
- [ ] Referencier dans outputHandles: `"schema": "$var:mon_schema"` (OBLIGATOIRE sur chaque output)

## Etape 5: Ecrire le handler JS

- [ ] Creer `functions/mon-handler.js`
- [ ] La fonction exportee DOIT avoir le meme nom que le `key` du nodeTemplate
- [ ] Signature: `async function(node, msg, inputs, opts)`
- [ ] Retourner toujours un objet avec `ok`:
  - Succes: `{ ok: true, ...data }`
  - Erreur: `{ ok: false, error: "message" }`
- [ ] Acceder aux args: via `inputs` (3eme parametre, compile). Pattern: `const args = inputs || {};`. **JAMAIS `node.args`** (n'existe pas !)
- [ ] Acceder aux credentials: via `opts.credentials`
- [ ] Acceder aux donnees entrantes: via `opts.incoming.byHandle`
- [ ] **Ajouter des logs de progression**: `const log = (opts && opts.log) ? opts.log : () => {};` puis `log('Étape en cours...')` à chaque étape importante
- [ ] Échapper les apostrophes françaises dans les logs: `log('Génération de l\'image...')`

## Etape 6: Verifier

- [ ] `PLUGIN_IMPORT_ENABLED=1` dans les variables d'environnement
- [ ] Redemarrer l'API pour declencher l'import du manifest
- [ ] Verifier les logs: `[plugins] import ok manifest.json providers(...) templates(...)`
- [ ] Le node apparait dans le catalogue du frontend
- [ ] Le formulaire s'affiche correctement dans l'inspecteur
- [ ] Executer un flow de test avec le node
- [ ] Verifier le resultat dans les evenements du run

## Patterns recommandes pour les `key`

```
{provider}_{action}           → openai_chat_completion, email_send, slack_post_message
{provider}_{objet}_{action}   → github_issue_create, google_drive_file_upload
```

## Template rapide - Node function minimal

**manifest.json:**
```json
{
  "repo": { "name": "mon-plugin", "type": "local" },
  "providers": [
    { "key": "mon_prov", "name": "Mon Service", "iconClass": "fa-solid fa-gear", "color": "#6366f1", "hasCredentials": false }
  ],
  "nodeTemplates": [
    {
      "key": "mon_prov_action",
      "name": "monProvAction",
      "schemaVersion": 2,
      "title": "Mon Action",
      "type": "function",
      "nodeKind": "function",
      "category": "Custom",
      "providerKey": "mon_prov",
      "icon": "fa-solid fa-bolt",
      "description": "Description du node",
      "inputHandles": [{ "id": "in", "name": "In", "type": "any", "accepts": ["any","payload"] }],
      "outputHandles": [{ "id": "ok", "name": "Success", "type": "payload" }],
      "authorize_catch_error": true,
      "args": {
        "title": "Mon Action",
        "ui": { "layout": "vertical", "labelsOnTop": true },
        "fields": [
          { "type": "text", "key": "param1", "label": "Parametre 1", "col": { "xs": 24 }, "validators": [{"type":"required"}] }
        ]
      }
    }
  ]
}
```

**functions/handler.js:**
```javascript
module.exports = {
  async mon_prov_action(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const param1 = String(inputs.param1 || '');
    if (!param1) return { ok: false, error: 'param1 is required' };

    log('Traitement en cours...');
    // Logique metier ici...

    return { ok: true, result: param1 };
  }
};
```

## Template rapide - Function multi-output (classificateur)

Voir **multi-output.md** pour les details complets.

**manifest.json:**
```json
{
  "repo": { "name": "mon-plugin", "type": "local" },
  "providers": [
    { "key": "mon_prov", "name": "Mon Service", "iconClass": "fa-solid fa-tags", "color": "#6366f1", "hasCredentials": true }
  ],
  "nodeTemplates": [
    {
      "key": "mon_prov_classify",
      "name": "monProvClassify",
      "schemaVersion": 2,
      "title": "Classifier",
      "type": "function",
      "nodeKind": "function",
      "category": "AI",
      "providerKey": "mon_prov",
      "icon": "fa-solid fa-tags",
      "description": "Classifier un texte selon des categories.",
      "output_array_field": "categories",
      "outputSchema": [
        { "key": "category", "type": "string", "label": "Categorie" },
        { "key": "confidence", "type": "number", "label": "Confiance" }
      ],
      "inputHandles": [{ "id": "in", "name": "In", "type": "any", "accepts": ["any","payload"] }],
      "authorize_catch_error": true,
      "args": {
        "title": "Classification",
        "ui": { "layout": "vertical", "labelsOnTop": true },
        "fields": [
          { "type": "text", "key": "text", "label": "Texte", "expression": { "allow": true }, "col": { "xs": 24 } },
          {
            "type": "section", "key": "categories", "title": "Catégories", "mode": "array",
            "array": { "initialItems": 2, "minItems": 1, "controls": { "add": { "kind": "text", "text": "Ajouter" }, "remove": { "kind": "text", "text": "Supprimer" } } },
            "fields": [
              { "type": "text", "key": "name", "label": "Nom", "col": { "xs": 12 } },
              { "type": "text", "key": "description", "label": "Description", "col": { "xs": 12 } }
            ],
            "col": { "xs": 24 }
          }
        ]
      }
    }
  ]
}
```

**functions/handler.js:**
```javascript
module.exports = {
  async mon_prov_classify(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const categories = node.model.context.categories || [];
    const text = String(inputs.text || '').trim();
    if (!text) return { ok: false, error: 'Texte requis' };

    log('Classification en cours...');

    // ... logique de classification (API, ML, regles) ...
    const chosenIndex = 0; // resultat de la classification
    const chosen = categories[chosenIndex];
    if (!chosen) return { ok: false, error: 'Aucune categorie trouvee' };

    return {
      ok: true,
      _output: chosen._id,          // Route vers le handle de la categorie choisie
      category: chosen.name,
      confidence: 0.92
    };
  }
};
```
