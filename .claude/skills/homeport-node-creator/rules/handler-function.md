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

### Handler avec credentials (OpenAI)

```javascript
module.exports = {
  async openai_chat_completion(node, msg, inputs, opts) {
    const creds = (opts && opts.credentials) || {};
    const apiKey = creds.apiKey;
    if (!apiKey) throw new Error('Missing OpenAI apiKey in credentials');

    const model = String(inputs.model || creds.defaultModel || 'gpt-4o-mini');
    const temperature = inputs.temperature != null ? Number(inputs.temperature) : 0.7;
    const system = String(inputs.system || '').trim();
    const prompt = String(inputs.prompt || '').trim();

    // ... logique API ...

    return { ok: true, text: "reponse du modele" };
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

## Bonnes pratiques

1. **Toujours retourner un objet avec `ok`**: `{ ok: true, ... }` ou `{ ok: false, error: "..." }`
2. **Valider les inputs**: Verifier les champs requis, parser le JSON avec try/catch
3. **Credentials via opts**: Ne jamais hardcoder de secrets, utiliser `opts.credentials`
4. **Gerer les erreurs**: try/catch autour des appels externes, retourner un message d'erreur clair
5. **Nom de la fonction = key du manifest**: `openai_chat_completion` dans le manifest = `async openai_chat_completion()` dans le handler
6. **Acceder aux args**: Utiliser `inputs` (deja compile) ou `node.args` / `node.model?.context`
7. **Pas de side effects**: Les handlers doivent etre idempotents si possible
8. **require conditionnel**: Pour les dependances optionnelles, faire un try/catch sur require()
