# Exemples complets reels

Exemples tires directement du codebase Homeport.

---

## 1. HTTP Request (function simple, sans credentials)

**Plugin:** `repos/http/`

**manifest.json (extrait):**
```json
{
  "repo": { "name": "http", "type": "local", "label": "HTTP" },
  "variables": {
    "http_response": {
      "title": "Reponse HTTP",
      "ui": { "layout": "vertical", "labelsOnTop": true },
      "fields": [
        { "type": "number", "key": "status", "label": "Status", "col": { "xs": 24 } },
        { "type": "textarea", "key": "headers", "label": "Headers (JSON)", "col": { "xs": 24 } },
        { "type": "textarea", "key": "body", "label": "Body (JSON)", "col": { "xs": 24 } }
      ]
    }
  },
  "providers": [
    { "key": "http", "name": "HTTP", "iconClass": "fa-solid fa-globe", "color": "#0ea5e9", "hasCredentials": false }
  ],
  "nodeTemplates": [
    {
      "key": "http",
      "name": "httpRequest",
      "schemaVersion": 2,
      "title": "HTTP Request",
      "subtitle": "Call API",
      "type": "function",
      "category": "HTTP",
      "providerKey": "http",
      "description": "Effectuer un appel HTTP",
      "inputHandles": [{ "id": "in", "name": "In", "type": "payload", "accepts": ["payload","any"] }],
      "outputHandles": [{ "id": "ok", "name": "Success", "type": "payload", "schema": "$var:http_response" }],
      "args": {
        "title": "HTTP",
        "ui": { "layout": "vertical", "labelsOnTop": true },
        "fields": [
          { "type": "select", "key": "method", "label": "Methode", "options":[{"label":"GET","value":"GET"},{"label":"POST","value":"POST"},{"label":"PUT","value":"PUT"},{"label":"PATCH","value":"PATCH"},{"label":"DELETE","value":"DELETE"}], "default": "GET", "col": { "xs": 24 } },
          { "type": "text", "key": "url", "label": "URL", "validators":[{"type":"required"}], "col": { "xs": 24 } },
          { "type": "textarea", "key": "headers", "label": "Headers (JSON)", "default": "{}", "col": { "xs": 24 } },
          { "type": "textarea", "key": "body", "label": "Body (JSON)", "default": "{}", "visibleIf": { "method": ["POST","PUT","PATCH"] }, "col": { "xs": 24 } }
        ]
      }
    }
  ]
}
```

**functions/http.js:**
```javascript
module.exports = {
  async http(node, msg, inputs, opts) {
    const args = inputs || {};  // TOUJOURS utiliser inputs, JAMAIS node.args
    const method = String(args.method || 'GET').toUpperCase();
    const url = String(args.url || '').trim();
    if (!url) throw new Error('http.url is required');
    let headers = {};
    try { headers = args.headers ? JSON.parse(args.headers) : {}; } catch { headers = {}; }
    let body;
    if (['POST','PUT','PATCH','DELETE'].includes(method)) {
      if (args.body && typeof args.body === 'string' && args.body.trim().startsWith('{')) {
        body = args.body;
        headers['content-type'] = headers['content-type'] || 'application/json';
      } else if (args.body && typeof args.body === 'object') {
        body = JSON.stringify(args.body);
        headers['content-type'] = headers['content-type'] || 'application/json';
      }
    }
    const res = await fetch(url, { method, headers, body });
    const ct = String(res.headers.get('content-type') || '').toLowerCase();
    let data;
    try {
      if (ct.includes('application/json')) data = await res.json();
      else data = await res.text();
    } catch { data = await res.text().catch(()=>null); }
    return { status: res.status, ok: res.ok, headers: Object.fromEntries(res.headers.entries()), data };
  }
};
```

---

## 2. OpenAI Chat Completion (function avec credentials)

**Plugin:** `repos/openai/`

**manifest.json (extrait nodeTemplate):**
```json
{
  "key": "openai_chat_completion",
  "name": "openaiChatCompletion",
  "schemaVersion": 2,
  "title": "Chat Completion",
  "type": "function",
  "nodeKind": "function",
  "category": "AI",
  "providerKey": "openai",
  "inputHandles": [{ "id": "in", "name": "In", "type": "any", "accepts": ["any"] }],
  "outputHandles": [{ "id": "ok", "name": "Success", "type": "payload", "schema": "$var:llm_text" }],
  "description": "Generer une completion de chat",
  "args": {
    "title": "Chat Completion",
    "ui": { "layout": "vertical", "labelsOnTop": true },
    "fields": [
      { "type": "text", "key": "model", "label": "Modele", "default": "gpt-4o-mini", "col": { "xs": 24 } },
      { "type": "textarea", "key": "system", "label": "Systeme", "col": { "xs": 24 } },
      { "type": "textarea", "key": "prompt", "label": "Prompt (User)", "validators": [{"type":"required"}], "col": { "xs": 24 } },
      { "type": "number", "key": "temperature", "label": "Temperature", "default": 0.7, "col": { "xs": 24 } },
      { "type": "number", "key": "maxTokens", "label": "Max tokens", "col": { "xs": 24 } }
    ]
  }
}
```

**functions/openai.js (extrait):**
```javascript
const { ChatOpenAI } = require('@langchain/openai');

module.exports = {
  async openai_chat_completion(node, msg, inputs, opts) {
    const creds = (opts && opts.credentials) || {};
    const modelName = String(inputs.model || creds.defaultModel || 'gpt-4o-mini');
    const temperature = (inputs.temperature == null ? 0.7 : Number(inputs.temperature));
    const maxTokens = inputs.maxTokens != null ? Number(inputs.maxTokens) : undefined;
    const sys = String(inputs.system || '').trim();
    const prompt = String(inputs.prompt || '').trim();

    const llm = new ChatOpenAI({ apiKey: creds.apiKey, model: modelName })
      .bind({ temperature, max_tokens: maxTokens });

    const messages = [];
    if (sys) messages.push({ role: 'system', content: sys });
    messages.push({ role: 'user', content: prompt });

    const res = await llm.invoke(messages);
    return { ok: true, text: (res && res.content) || '' };
  }
};
```

---

## 3. Email Send (function avec credentials SMTP)

**functions/send.js:**
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
      from: inputs.from || username, to: inputs.to,
      cc: inputs.cc || undefined, bcc: inputs.bcc || undefined,
      subject: inputs.subject, text: inputs.text,
      html: inputs.html && inputs.html.trim() !== "" ? inputs.html : undefined
    });

    return { ok: true, sent: true, messageId: info.messageId, envelope: info.envelope };
  }
};
```

---

## 4. Wait All (core function, format { key, run })

**functions/wait_all.js:**
```javascript
exports.key = 'wait_all';
exports.run = async (node, msg, inputs, opts) => {
  const expected = inputs?.expected ?? 'auto';
  const combine = inputs?.combine ?? 'array';
  const objectKey = inputs?.objectKey ?? 'nodeId';
  return { ok: true, waited: { expected, combine, objectKey }, received: 1, payload: msg.payload };
};
```

---

## 5. Webhook/Event (type event, pas d'input)

**manifest.json (extrait):**
```json
{
  "key": "core_webhook",
  "name": "httpEndpoint",
  "schemaVersion": 2,
  "title": "Point d'entree HTTP",
  "subtitle": "Webhook",
  "type": "event",
  "category": "HTTP",
  "providerKey": "http",
  "outputHandles": [{ "id": "ok", "name": "Success", "type": "payload", "schema": "$var:http_incoming" }],
  "args": {
    "title": "Point d'entree HTTP",
    "ui": { "layout": "vertical", "labelsOnTop": true },
    "fields": [
      { "type": "text", "key": "path", "label": "Chemin", "default": "/hooks/event", "validators": [{"type":"required"}], "col": { "xs": 24 } },
      { "type": "select", "key": "method", "label": "Methode", "options": [{"label":"GET","value":"GET"},{"label":"POST","value":"POST"}], "default": "POST", "col": { "xs": 24 } },
      { "type": "checkbox", "key": "cors", "label": "Autoriser CORS", "default": true, "col": { "xs": 24 } }
    ]
  }
}
```

---

## 6. Agent OpenAI (type agent avec linkedHandles)

**manifest.json (extrait):**
```json
{
  "key": "openai_agent",
  "name": "openaiAgent",
  "schemaVersion": 2,
  "title": "Agent OpenAI",
  "type": "agent",
  "nodeKind": "agent",
  "category": "AI",
  "providerKey": "openai",
  "inputHandles": [{ "id": "in", "name": "In", "type": "any", "accepts": ["any", "payload"] }],
  "outputHandles": [{ "id": "ok", "name": "Success", "type": "payload", "schema": "$var:llm_text" }],
  "linkedHandles": [
    { "id": "tools", "name": "Tools", "type": "ai_tool", "multiple": true, "accepts": ["ai_tool"] },
    { "id": "memory", "name": "Memory", "type": "ai_memory", "multiple": true, "accepts": ["ai_memory"] }
  ],
  "args": {
    "fields": [
      { "type": "text", "key": "model", "label": "Modele", "default": "gpt-4o-mini", "col": { "xs": 24 } },
      { "type": "textarea", "key": "system", "label": "Systeme", "col": { "xs": 24 } },
      { "type": "textarea", "key": "prompt", "label": "Prompt", "validators": [{"type":"required"}], "col": { "xs": 24 } },
      { "type": "number", "key": "temperature", "label": "Temperature", "default": 0.7, "col": { "xs": 24 } }
    ]
  }
}
```

**functions/openai.js (extrait agent):**
```javascript
async openai_agent(node, msg, inputs, opts) {
  const creds = (opts && opts.credentials) || {};
  const incoming = opts?.incoming?.byHandle || {};

  // Recuperer memoires et outils via linkedHandles
  const memories = Array.isArray(incoming['memory']) ? incoming['memory'] : [];
  const tools = Array.isArray(incoming['tools']) ? incoming['tools'] : [];

  const memText = memories.map(m => {
    if (m && Array.isArray(m.texts)) return m.texts.join('\n');
    return '';
  }).filter(Boolean).join('\n');

  const toolText = tools.map(t => `- ${t?.name}: ${t?.description || ''}`).join('\n');

  const sysParts = [];
  if (inputs.system) sysParts.push(inputs.system);
  if (toolText) sysParts.push(`Available tools:\n${toolText}`);
  if (memText) sysParts.push(`Memory:\n${memText}`);

  const messages = [];
  if (sysParts.length) messages.push({ role: 'system', content: sysParts.join('\n\n') });
  messages.push({ role: 'user', content: inputs.prompt });

  const llm = new ChatOpenAI({ apiKey: creds.apiKey, model: inputs.model || 'gpt-4o-mini' });
  const res = await llm.invoke(messages);
  return { ok: true, text: (res && res.content) || '' };
}
```

---

## 7. Condition (type condition, pas de handler JS)

**manifest.json (extrait):**
```json
{
  "key": "condition",
  "name": "condition",
  "schemaVersion": 2,
  "title": "Condition",
  "type": "condition",
  "providerKey": "logic",
  "icon": "fa-solid fa-code-branch",
  "output_array_field": "items",
  "args": {
    "fields": [
      {
        "type": "section",
        "title": "Branches",
        "key": "items",
        "mode": "array",
        "array": { "initialItems": 1, "minItems": 0 },
        "fields": [
          { "type": "text", "key": "name", "label": "Nom", "validators": [{"type":"required"}] },
          { "type": "text", "key": "condition", "label": "Condition", "expression": { "allow": true }, "validators": [{"type":"required"}] }
        ]
      },
      { "type": "checkbox", "key": "else_enabled", "label": "Activer Else", "default": false }
    ]
  }
}
```

Note: Le node `condition` n'a PAS de handler JS. Le moteur (`engine/index.js`) evalue directement les conditions.

---

## 8. Loop (type loop, pas de handler JS)

**manifest.json (extrait):**
```json
{
  "key": "loop",
  "name": "loop",
  "schemaVersion": 2,
  "title": "Boucle",
  "type": "loop",
  "providerKey": "logic",
  "icon": "fa-solid fa-arrows-rotate",
  "inputHandles": [
    { "id": "in", "name": "In", "type": "payload", "accepts": ["payload", "any"] },
    { "id": "items", "name": "Items", "type": "payload", "multiple": true, "accepts": ["payload", "any"] }
  ],
  "outputHandles": [
    { "id": "after", "name": "After", "type": "payload" },
    { "id": "each", "name": "Each", "type": "payload" }
  ],
  "args": {
    "fields": [
      { "type": "text", "key": "itemsArg", "label": "Tableau ou chemin", "expression": { "allow": true }, "col": { "xs": 24 } },
      { "type": "text", "key": "itemVar", "label": "Variable element", "default": "item", "col": { "xs": 12 } },
      { "type": "text", "key": "indexVar", "label": "Variable index", "default": "index", "col": { "xs": 12 } },
      { "type": "checkbox", "key": "perItemPayload", "label": "Payload = element", "default": true, "col": { "xs": 24 } },
      { "type": "select", "key": "resultMode", "label": "Resultat", "options": [{"label":"Collecter","value":"collect"},{"label":"Dernier","value":"last"}], "default": "collect", "col": { "xs": 24 } },
      { "type": "number", "key": "maxIterations", "label": "Iterations max", "default": 1000, "col": { "xs": 24 } }
    ]
  }
}
```

Note: Le node `loop` n'a PAS de handler JS. Le moteur gere l'iteration.
