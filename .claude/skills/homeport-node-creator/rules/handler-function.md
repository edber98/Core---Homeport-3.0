# Handler Functions (Code JS)

Les handlers sont les fonctions JavaScript qui s'executent quand un node est atteint dans un flow.

## Emplacement

```
API/src/plugins/{local|repos}/{plugin-name}/functions/{fichier}.js
```

## Formats d'export supportes

Le registry supporte 3 formats d'export:

### Format 1: Objet de fonctions (RECOMMANDE)

Chaque cle est le `key` du node template. Permet plusieurs handlers par fichier.

```javascript
module.exports = {
  async mon_action(node, msg, inputs, opts) {
    // ...
    return { ok: true, result: "data" };
  },

  async mon_autre_action(node, msg, inputs, opts) {
    // ...
    return { ok: true };
  }
};
```

**IMPORTANT**: La cle de la fonction DOIT correspondre au `key` du nodeTemplate dans le manifest.
Le registry normalise les cles: `openai_chat_completion`, `openaiChatCompletion`, `openaichatcompletion` sont equivalents.

### Format 2: Export { key, run } (pour fichier = 1 handler)

```javascript
exports.key = 'wait_all';
exports.run = async (node, msg, inputs, opts) => {
  return { ok: true, waited: true };
};
```

### Format 3: Handlers map

```javascript
module.exports = {
  handlers: {
    mon_action: async (node, msg, inputs, opts) => { ... },
    autre_action: async (node, msg, inputs, opts) => { ... }
  }
};
```

## Signature de la fonction

```javascript
async function handler(node, msg, inputs, opts) { ... }
```

### Parametre `node` - Configuration du node

```javascript
{
  id: "nodeId_abc123",           // ID unique du node dans le flow
  model: {
    context: { ... },            // Args compiles (apres resolution des expressions)
    templateObj: { ... },        // Objet template complet
    template: "openai_chat_completion", // Key du template
    catch_error: true,           // Activer catch error
    skip_error: false            // Activer skip error
  }
}
```

**Acces aux args**: `node.model?.context` ou directement `inputs` (qui est deja le contexte compile).

### Parametre `msg` - Message courant

```javascript
{
  payload: { ... },              // Payload courant (resultat du node precedent)
  _nodes: { ... },               // Historique de tous les nodes executes
  [nodeId]: { ... }              // Resultat de chaque node accessible par son ID
}
```

### Parametre `inputs` - Args compiles

C'est `node.model.context` apres compilation des expressions/templates. Contient directement les valeurs des champs du formulaire.

```javascript
// Pour un node HTTP avec args: { method: "POST", url: "https://...", body: "{...}" }
inputs = {
  method: "POST",
  url: "https://api.example.com/data",
  body: '{"key": "value"}'
}
```

### Parametre `opts` - Options runtime

```javascript
{
  credentials: {                 // Credentials du provider (dechiffres)
    apiKey: "sk-...",
    baseUrl: "https://...",
    // ... tous les champs du credentialsForm
  },
  incoming: {                    // Donnees entrantes par handle
    byHandle: {
      "in": [resultNodePrecedent],    // Array de resultats par handle ID
      "tools": [tool1, tool2],        // Pour linkedHandles
      "memory": [mem1]                // Pour linkedHandles
    },
    flat: [                           // Liste plate de toutes les connexions
      { sourceId: "...", sourceHandle: "ok", targetHandle: "in", result: { ... } }
    ]
  },
  log: function(text),             // Envoyer un message de progression en temps réel (affiché sur le node)
  files: {                         // Helper fichiers (scope workspace/run)
    store(source, metadata),       // Stocker un fichier (stream/buffer/base64) → fileRef
    resolve(fileRef),              // Resoudre fileRef/URL → { stream, record }
    resolveAsBuffer(fileRef),      // Resoudre → Buffer
    resolveAsBase64(fileRef),      // Resoudre → string base64
    storeFromUrl(url, metadata),   // Telecharger une URL et stocker → fileRef
    remove(fileIdOrRef)            // Supprimer un fichier
  }
}
```

## Valeur de retour

Le handler DOIT retourner un objet. Cet objet devient:
1. `msg[nodeId]` - Accessible par les nodes suivants via `{{ nodeId.champ }}`
2. `msg.payload` - Le payload courant pour le node suivant

### Retour succes

```javascript
return { ok: true, text: "Hello", count: 42 };
```

### Retour succes avec routage explicite (multi-output)

Pour les fonctions avec `output_array_field`, le handler choisit la branche de sortie via `_output` :

```javascript
// _output = _id de l'element du array field qui correspond au handle de sortie
return { ok: true, _output: chosen._id, category: chosen.name, confidence: 0.92 };
```

Le moteur route vers le `sourceHandle` correspondant au `_output`. Si `_output` n'est pas defini, le comportement est standard (toutes les sorties non-error). Voir **multi-output.md** pour les details complets.

### Retour erreur

```javascript
return { ok: false, error: "Description de l'erreur" };
```

Ou throw une exception:
```javascript
throw new Error("Quelque chose a echoue");
```

Le moteur detecte l'erreur si `result.ok === false` ou `result.error != null`, et route vers le handle `err`/`error` si `authorize_catch_error` est active.

## Exemples complets

### Handler simple (HTTP)

```javascript
module.exports = {
  async http(node, msg, inputs) {
    const args = (node && node.args) || {};
    const method = String(args.method || 'GET').toUpperCase();
    const url = String(args.url || '').trim();
    if (!url) throw new Error('http.url is required');

    let headers = {};
    try { headers = args.headers ? JSON.parse(args.headers) : {}; } catch { headers = {}; }

    let body;
    if (['POST','PUT','PATCH','DELETE'].includes(method)) {
      if (args.body && typeof args.body === 'string') {
        body = args.body;
        if (args.body.trim().startsWith('{'))
          headers['content-type'] = headers['content-type'] || 'application/json';
      }
    }

    const res = await fetch(url, { method, headers, body });
    const ct = String(res.headers.get('content-type') || '');
    let data;
    if (ct.includes('application/json')) data = await res.json();
    else data = await res.text();

    return { status: res.status, ok: res.ok, headers: Object.fromEntries(res.headers.entries()), data };
  }
};
```

### Handler avec credentials et logs (OpenAI)

```javascript
module.exports = {
  async openai_chat_completion(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const creds = (opts && opts.credentials) || {};
    const apiKey = creds.apiKey;
    if (!apiKey) throw new Error('Missing OpenAI apiKey in credentials');

    const model = String(inputs.model || creds.defaultModel || 'gpt-4o-mini');
    const temperature = inputs.temperature != null ? Number(inputs.temperature) : 0.7;
    const system = String(inputs.system || '').trim();
    const prompt = String(inputs.prompt || '').trim();

    log('Envoi de la requête à OpenAI...');
    // ... logique API avec streaming ...
    let fullText = '';
    for await (const chunk of stream) {
      const token = chunk.choices?.[0]?.delta?.content || '';
      fullText += token;
      log(fullText);  // Streaming progressif affiché sur le node
    }

    return { ok: true, text: fullText };
  }
};
```

### Handler avec incoming (Agent AI)

```javascript
module.exports = {
  async openai_agent(node, msg, inputs, opts) {
    const creds = (opts && opts.credentials) || {};
    const incoming = opts?.incoming?.byHandle || {};

    // Recuperer les outils et memoires via linkedHandles
    const memories = Array.isArray(incoming['memory']) ? incoming['memory'] : [];
    const tools = Array.isArray(incoming['tools']) ? incoming['tools'] : [];

    const memText = memories.map(m => {
      if (m && Array.isArray(m.texts)) return m.texts.join('\n');
      if (m && typeof m.text === 'string') return m.text;
      return '';
    }).filter(Boolean).join('\n');

    // ... utiliser memText et tools dans le prompt ...

    return { ok: true, text: "reponse" };
  }
};
```

### Handler avec dependance externe (Email)

```javascript
module.exports = {
  async email_send(node, msg, inputs, opts) {
    let nodemailer;
    try { nodemailer = require("nodemailer"); }
    catch { return { ok: false, error: "Missing dependency: nodemailer" }; }

    const { smtpHost, smtpPort, smtpSecure, username, password } = opts.credentials || {};

    const transporter = nodemailer.createTransport({
      host: smtpHost, port: smtpPort, secure: smtpSecure,
      auth: { user: username, pass: password }
    });

    const info = await transporter.sendMail({
      from: inputs.from || username,
      to: inputs.to,
      subject: inputs.subject,
      text: inputs.text,
      html: inputs.html || undefined
    });

    return { ok: true, sent: true, messageId: info.messageId };
  }
};
```

### Handler avec fichiers (Upload vers API externe)

```javascript
module.exports = {
  async my_service_upload(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.path) return { ok: false, error: "Chemin requis." };

    // d.file peut etre: fileRef (upload), URL string (expression), ou texte
    let body;
    const fileVal = d.file || d.content;

    if (fileVal && opts.files && typeof fileVal === 'object' && fileVal._type === 'fileRef') {
      body = await opts.files.resolveAsBuffer(fileVal);
    } else if (fileVal && opts.files && typeof fileVal === 'string' && /^https?:\/\//i.test(fileVal)) {
      body = await opts.files.resolveAsBuffer(fileVal);
    } else {
      body = fileVal || "";
    }

    // Utiliser body pour l'upload vers l'API externe...
    return { ok: true, status: "uploaded", message: `Fichier televerser: ${d.path}` };
  }
};
```

### Handler avec fichiers (Download depuis API externe)

```javascript
module.exports = {
  async my_service_download(node, msg, inputs, opts) {
    const d = inputs || {};
    // ... telecharger le fichier depuis l'API externe ...
    const data = "base64encodeddata..."; // base64 string du fichier telecharge
    const name = "document.pdf";
    const mimeType = "application/pdf";

    // Stocker via opts.files pour retourner un fileRef
    let file = null;
    if (opts.files && data) {
      file = await opts.files.store(data, {
        name,
        mimeType,
        lifecycle: "execution"
      });
    }

    return { ok: true, name, contentType: mimeType, file };
  }
};
```

## Logs de progression en temps réel (`opts.log`)

Le moteur injecte une fonction `log` dans `opts` qui permet d'envoyer des messages de progression affichés en temps réel sur le node dans le flow builder et l'exécution.

### Utilisation de base

```javascript
// TOUJOURS initialiser avec un fallback (log peut être absent dans certains contextes)
const log = (opts && opts.log) ? opts.log : () => {};

log('Authentification en cours...');
// ... faire l'appel API ...
log('Requête envoyée, traitement...');
// ... traiter la réponse ...
log('Terminé, 42 résultats trouvés');
```

### Pattern recommandé : étapes numérotées

```javascript
const log = (opts && opts.log) ? opts.log : () => {};

log('1/3 Récupération des données...');
const data = await fetchData(inputs.url);

log('2/3 Transformation...');
const result = transformData(data);

log('3/3 Envoi du résultat...');
await sendResult(result);

return { ok: true, count: result.length };
```

### Pattern : streaming de tokens LLM

Pour les handlers qui appellent un LLM avec streaming, accumuler le texte reçu :

```javascript
const log = (opts && opts.log) ? opts.log : () => {};
let fullText = '';

log('Génération en cours...');
for await (const chunk of stream) {
  const token = chunk.choices?.[0]?.delta?.content || '';
  fullText += token;
  log(fullText);  // Le frontend affiche le texte qui s'allonge avec un effet de révélation
}

return { ok: true, text: fullText };
```

### Comportement

- Le texte est envoyé via un événement SSE `node.log` et affiché à côté du node
- Le texte est affiché avec une animation shimmer et un effet de révélation progressive
- Quand le node termine (succès ou erreur), le texte disparaît automatiquement
- Un texte vide `log('')` efface le message affiché
- Les appels sont non-bloquants, le handler continue son exécution
- **IMPORTANT** : Toujours initialiser avec fallback `const log = (opts && opts.log) ? opts.log : () => {};`
- **IMPORTANT** : Échapper les apostrophes françaises dans les strings avec `\'` (ex: `log('Génération de l\'image...')`)

## Handlers de type "list" (IMPORTANT)

Les handlers qui listent des éléments (list, search, etc.) DOIVENT suivre ce pattern :

### Pattern obligatoire

```javascript
async my_plugin_items_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération de la liste...');

    const res = await myApiCall('/items', { query: { per_page: inputs.per_page } });
    if (!res.ok) return res;

    // 1. MAPPER les données (ne garder que les champs utiles)
    const items = (res.data || []).map(r => ({
      id: r.id,
      name: r.name,
      created_at: r.created_at,
      // ... seulement les champs pertinents
    }));

    // 2. Retourner avec une clé NOMMÉE + totalCount
    return { ok: true, items, totalCount: items.length };
}
```

### Règles

1. **Clé nommée pour l'array** : utiliser `projects`, `issues`, `contacts`, etc. — PAS `data` générique
2. **`totalCount`** : toujours inclure `totalCount: items.length` pour que le viewer affiche le nombre total
3. **Mapper les champs** : extraire seulement les champs utiles, aplatir les objets imbriqués (ex: `author: r.author?.name`)
4. **Types corrects dans la variable/schema** : `"type": "date"` pour les dates (created_at, updated_at, etc.), `"type": "checkbox"` pour les booléens
5. **Variable correspondante** : le schema de sortie (variable) DOIT avoir un champ `totalCount` (type number) et la section array avec la même clé que le handler

### Exemple de variable de sortie correspondante

```json
"my_plugin_items": {
  "title": "Éléments",
  "fields": [
    { "type": "checkbox", "key": "ok", "label": "Succès" },
    { "type": "number", "key": "totalCount", "label": "Nombre total" },
    {
      "type": "section", "key": "items", "title": "Éléments",
      "mode": "array", "fields": [
        { "type": "text", "key": "id", "label": "ID" },
        { "type": "text", "key": "name", "label": "Nom" },
        { "type": "date", "key": "created_at", "label": "Date de création" }
      ]
    }
  ]
}
```

## Bonnes pratiques

1. **Toujours retourner un objet avec `ok`**: `{ ok: true, ... }` ou `{ ok: false, error: "..." }`
2. **Valider les inputs**: Verifier les champs requis, parser le JSON avec try/catch
3. **Credentials via opts**: Ne jamais hardcoder de secrets, utiliser `opts.credentials`
4. **Gerer les erreurs**: try/catch autour des appels externes, retourner un message d'erreur clair
5. **Nom de la fonction = key du manifest**: `openai_chat_completion` dans le manifest = `async openai_chat_completion()` dans le handler
6. **Acceder aux args**: Utiliser `inputs` (deja compile) ou `node.args` / `node.model?.context`
7. **Pas de side effects**: Les handlers doivent etre idempotents si possible
8. **require conditionnel**: Pour les dependances optionnelles, faire un try/catch sur require()
9. **Logs de progression**: Ajouter `opts.log()` à chaque étape importante du handler pour informer l'utilisateur en temps réel
10. **List handlers** : Toujours inclure `totalCount` et utiliser des clés nommées (voir section ci-dessus)
