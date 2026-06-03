#!/usr/bin/env node
// Générateur synthétique de dataset pour fine-tuning Qwen sur Kinn.
//
// Format Qwen messages (compatible OpenAI Chat Completions + tool_calls).
//
// 🛡️ COHÉRENCE STRICTE :
//   - Chaque topic déclare EXPLICITEMENT les champs sources disponibles.
//   - Toute référence `{{ nodeId.field }}` est validée contre cette liste.
//   - propose_context_mapping renvoie EXACTEMENT les champs déclarés.
//   - Pas d'invention de field "source.message" qui n'existe pas.
//
// COUVRE :
//   1. Création form (single + multi-fields)
//   2. Workflow simple (start → target avec bindings VALIDES)
//   3. Workflow extract (schema_builder dynamique)
//   4. Workflow condition (multi-output)
//   5. Édition form
//   6. spawn_subagent (research, file_analyzer, parallel, dependencies)
//   7. Génération docx via execute_code + python-docx
//   8. Génération pptx via execute_code + python-pptx
//   9. render_structured (tableaux, card_grid, stepped_plan)
//   10. display_file pour rendre les artefacts inline
//
// Usage : node scripts/generate-finetuning-dataset.js [--out ./dataset.jsonl] [--samples 2000]

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const args = process.argv.slice(2);
const OUT = args.indexOf('--out') >= 0 ? args[args.indexOf('--out') + 1] : path.join(__dirname, '..', 'dataset.jsonl');
const TARGET = parseInt(args[args.indexOf('--samples') + 1] || '2000', 10);

const SYSTEM_SHORT = `Tu es l'agent Kinn. Tu construis des formulaires, workflows et livrables via tool calls.
Tools principaux : create_form, add_field, save_form, create_flow, add_node, connect_nodes, set_node_args, propose_context_mapping, build_schema, save_flow, spawn_subagent, activate_capsule, execute_code, render_structured, display_file.
Référence les outputs upstream avec {{ nodeId.fieldName }} où fieldName DOIT exister dans l'outputSchema du nodeId — jamais inventer.`;

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const uid = (prefix) => `${prefix}_${crypto.randomBytes(3).toString('hex')}_${crypto.randomBytes(2).toString('hex')}`;
const newFormId = () => `frm_${crypto.randomBytes(4).toString('hex')}`;
const newFlowId = () => `flw_${crypto.randomBytes(4).toString('hex')}`;
const newFileId = () => `file_${crypto.randomBytes(5).toString('hex')}`;
const newJobId = () => `aij_${crypto.randomBytes(4).toString('hex')}_${crypto.randomBytes(3).toString('hex')}`;
const callId = (i) => `call_${i}_${crypto.randomBytes(3).toString('hex')}`;
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);

function toolCall(id, name, args) {
  return { id, type: 'function', function: { name, arguments: JSON.stringify(args) } };
}
function toolResult(callId, content) {
  return { role: 'tool', tool_call_id: callId, content: JSON.stringify(content) };
}
function appendSample(messages) {
  fs.appendFileSync(OUT, JSON.stringify({ messages }) + '\n');
}

// 🛡️ Validation : toute string contenant `{{ nodeId.field }}` doit pointer vers
//    un field déclaré. Renvoie liste des fields référencés.
function extractRefs(value) {
  if (typeof value !== 'string') return [];
  const out = [];
  const re = /\{\{\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*\}\}/g;
  let m; while ((m = re.exec(value)) !== null) out.push({ nodeId: m[1], field: m[2] });
  return out;
}

// ─────────────────────────────────────────────────────────────────────
// VOCABULAIRE
// ─────────────────────────────────────────────────────────────────────
const FORM_TOPICS = [
  { name: 'Inscription événement', fields: ['nom', 'email', 'téléphone', 'nombre_personnes', 'régime_alimentaire', 'commentaires'] },
  { name: 'Contact client', fields: ['prénom', 'nom', 'email', 'entreprise', 'sujet', 'message'] },
  { name: 'Demande de devis', fields: ['société', 'email', 'service', 'budget', 'délai', 'description'] },
  { name: 'Avis produit', fields: ['note', 'titre', 'avis', 'recommandation'] },
  { name: 'Candidature emploi', fields: ['nom_complet', 'email', 'cv', 'poste', 'expérience', 'motivation'] },
  { name: 'Réservation', fields: ['date', 'heure', 'nb_personnes', 'nom_réservation', 'téléphone', 'demandes_spéciales'] },
  { name: 'Newsletter', fields: ['email', 'centres_intérêt', 'fréquence', 'consentement'] },
  { name: 'Sondage satisfaction', fields: ['note_globale', 'recommandation_score', 'points_forts', 'points_améliorer'] },
  { name: 'Demande support', fields: ['email', 'sévérité', 'catégorie', 'titre', 'description'] },
  { name: 'Inscription formation', fields: ['nom', 'email', 'formation_choisie', 'niveau', 'objectifs'] },
];

const FIELD_TYPES = {
  email: { type: 'email', col: { xs: 24, md: 12 } },
  text: { type: 'text', col: { xs: 24, md: 12 } },
  textarea: { type: 'textarea', col: { xs: 24 } },
  number: { type: 'number', col: { xs: 24, md: 8 } },
  tel: { type: 'tel', col: { xs: 24, md: 12 } },
  url: { type: 'url', col: { xs: 24 } },
  date: { type: 'date', col: { xs: 24, md: 8 } },
  select: { type: 'select', col: { xs: 24, md: 12 } },
  checkbox: { type: 'checkbox', col: { xs: 24 } },
  file: { type: 'file', col: { xs: 24 } },
  rate: { type: 'rate', col: { xs: 24, md: 8 } },
};
function detectFieldType(fieldName) {
  const n = fieldName.toLowerCase();
  if (/email|mail/.test(n)) return 'email';
  if (/(téléphone|tel|phone|mobile)/.test(n)) return 'tel';
  if (/(date|jour|heure)/.test(n)) return 'date';
  if (/url|lien|site/.test(n)) return 'url';
  if (/(nombre|nb_|count|montant|prix|budget)/.test(n)) return 'number';
  if (/(message|description|avis|motivation|commentaires?|détail|objectifs|points|demandes)/.test(n)) return 'textarea';
  if (/(cv|fichier|pièces|joint|upload)/.test(n)) return 'file';
  if (/(note|score|étoiles?)/.test(n)) return 'rate';
  if (/(consentement|accord|conditions|opt-?in)/.test(n)) return 'checkbox';
  if (/(catégorie|sujet|service|formation|sévérité|poste|recommandation|régime|fréquence|niveau|centres?_intérêt)/.test(n)) return 'select';
  return 'text';
}
function fieldOptionsFor(name) {
  const n = name.toLowerCase();
  if (/sévérité/.test(n)) return [{ label: 'Bloquant', value: 'critical' }, { label: 'Important', value: 'high' }, { label: 'Normal', value: 'medium' }, { label: 'Faible', value: 'low' }];
  if (/catégorie/.test(n)) return [{ label: 'Bug', value: 'bug' }, { label: 'Question', value: 'question' }, { label: 'Fonctionnalité', value: 'feature' }];
  if (/régime/.test(n)) return [{ label: 'Aucun', value: 'none' }, { label: 'Végétarien', value: 'veg' }, { label: 'Vegan', value: 'vegan' }];
  if (/fréquence/.test(n)) return [{ label: 'Quotidienne', value: 'daily' }, { label: 'Hebdomadaire', value: 'weekly' }, { label: 'Mensuelle', value: 'monthly' }];
  if (/niveau/.test(n)) return [{ label: 'Débutant', value: 'beginner' }, { label: 'Intermédiaire', value: 'intermediate' }, { label: 'Avancé', value: 'advanced' }];
  if (/recommandation/.test(n)) return [{ label: 'Oui', value: 'yes' }, { label: 'Peut-être', value: 'maybe' }, { label: 'Non', value: 'no' }];
  return [{ label: 'Option A', value: 'a' }, { label: 'Option B', value: 'b' }];
}

// Construit une fieldDef Kinn valide à partir d'un nom français.
function buildFieldDef(rawName) {
  const key = slugify(rawName);
  const ftype = detectFieldType(rawName);
  const def = FIELD_TYPES[ftype];
  const f = {
    key, type: def.type,
    label: rawName.charAt(0).toUpperCase() + rawName.slice(1).replace(/_/g, ' '),
    required: !/(commentaires|demandes|points_améliorer|consentement)/.test(key),
    col: def.col,
  };
  if (ftype === 'select') f.options = fieldOptionsFor(rawName);
  if (ftype === 'textarea') f.placeholder = `Saisissez votre ${rawName.replace(/_/g, ' ')}…`;
  return f;
}

// ─────────────────────────────────────────────────────────────────────
// GÉNÉRATEUR 1 : Form creation
// ─────────────────────────────────────────────────────────────────────
function genFormCreation() {
  const topic = rand(FORM_TOPICS);
  const prompts = [
    `Crée un formulaire "${topic.name}" avec : ${topic.fields.join(', ')}`,
    `Je veux un form pour ${topic.name.toLowerCase()}, champs : ${topic.fields.join(', ')}`,
    `Génère le formulaire ${topic.name} (${topic.fields.join(', ')})`,
  ];
  const fId = newFormId();
  const messages = [
    { role: 'system', content: SYSTEM_SHORT },
    { role: 'user', content: rand(prompts) },
  ];
  let i = 0;
  const c1 = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [toolCall(c1, 'create_form', { name: topic.name })] });
  messages.push(toolResult(c1, { success: true, formId: fId }));
  const fieldCalls = topic.fields.map(fn => toolCall(callId(i++), 'add_field', buildFieldDef(fn)));
  messages.push({ role: 'assistant', content: null, tool_calls: fieldCalls });
  fieldCalls.forEach(fc => messages.push(toolResult(fc.id, { success: true, key: JSON.parse(fc.function.arguments).key })));
  const cs = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [toolCall(cs, 'save_form', {})] });
  messages.push(toolResult(cs, { success: true, formId: fId }));
  messages.push({ role: 'assistant', content: `Formulaire "${topic.name}" créé (${topic.fields.length} champs).` });
  return messages;
}

// ─────────────────────────────────────────────────────────────────────
// GÉNÉRATEUR 2 : Workflow simple — 🛡️ COHÉRENT
// Chaque topic déclare startFields ET le mapping target → ces fields.
// ─────────────────────────────────────────────────────────────────────
const WORKFLOW_TOPICS_V2 = [
  {
    goal: 'Notifier Slack quand contact reçu',
    startFields: ['email', 'nom', 'message'],
    target: 'slack_post_message',
    targetArgs: (srcId) => ({
      channel: '#leads',
      text: `Nouveau contact de {{ ${srcId}.nom }} ({{ ${srcId}.email }}) : {{ ${srcId}.message }}`,
    }),
  },
  {
    goal: 'Email de confirmation après inscription',
    startFields: ['email', 'prénom', 'événement'],
    target: 'email_send',
    targetArgs: (srcId) => ({
      to: `{{ ${srcId}.email }}`,
      subject: 'Confirmation de votre inscription',
      body: `Bonjour {{ ${srcId}.prénom }}, votre inscription à {{ ${srcId}.événement }} est confirmée.`,
    }),
  },
  {
    goal: 'Créer une issue Linear depuis un bug report',
    startFields: ['titre', 'description', 'sévérité', 'email'],
    target: 'linear_create_issue',
    targetArgs: (srcId) => ({
      team: 'engineering',
      title: `{{ ${srcId}.titre }}`,
      description: `{{ ${srcId}.description }}\n\nReporté par : {{ ${srcId}.email }}`,
      priority: `{{ ${srcId}.sévérité }}`,
    }),
  },
  {
    goal: 'Ajouter un contact HubSpot',
    startFields: ['email', 'prénom', 'nom', 'entreprise'],
    target: 'hubspot_create_contact',
    targetArgs: (srcId) => ({
      email: `{{ ${srcId}.email }}`,
      firstname: `{{ ${srcId}.prénom }}`,
      lastname: `{{ ${srcId}.nom }}`,
      company: `{{ ${srcId}.entreprise }}`,
    }),
  },
  {
    goal: 'Poster sur Discord à chaque inscription',
    startFields: ['nom', 'email'],
    target: 'discord_send_message',
    targetArgs: (srcId) => ({
      channel_id: '1234567890',
      content: `Nouvelle inscription : **{{ ${srcId}.nom }}** ({{ ${srcId}.email }})`,
    }),
  },
  {
    goal: 'Stocker une réponse dans Airtable',
    startFields: ['nom', 'email', 'note', 'commentaire'],
    target: 'airtable_create_record',
    targetArgs: (srcId) => ({
      base: 'appXYZ',
      table: 'Avis',
      fields: {
        Nom: `{{ ${srcId}.nom }}`,
        Email: `{{ ${srcId}.email }}`,
        Note: `{{ ${srcId}.note }}`,
        Commentaire: `{{ ${srcId}.commentaire }}`,
      },
    }),
  },
];

function genWorkflowSimple() {
  const topic = rand(WORKFLOW_TOPICS_V2);
  const prompts = [
    `Workflow : ${topic.goal}`,
    `Crée un flow qui ${topic.goal.toLowerCase()}`,
    `${topic.goal}. Construis le workflow.`,
  ];
  const fId = newFlowId();
  const startId = uid('start_form');
  const targetId = uid(`function_${topic.target}`);
  const startFieldDefs = topic.startFields.map(fn => buildFieldDef(fn));

  const messages = [
    { role: 'system', content: SYSTEM_SHORT },
    { role: 'user', content: rand(prompts) },
  ];
  let i = 0;
  // create flow
  const c1 = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [toolCall(c1, 'create_flow', { name: topic.goal })] });
  messages.push(toolResult(c1, { success: true, flowId: fId }));

  // add start_form node + target
  const c2 = callId(i++), c3 = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [
    toolCall(c2, 'add_node', { templateKey: 'start_form', title: 'Déclencheur', near: { x: 100, y: 200 } }),
    toolCall(c3, 'add_node', { templateKey: topic.target, title: 'Action' }),
  ]});
  messages.push(toolResult(c2, { success: true, nodeId: startId }));
  messages.push(toolResult(c3, { success: true, nodeId: targetId }));

  // configure start_form avec build_schema (les champs de départ)
  const c4 = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [
    toolCall(c4, 'build_schema', {
      fields: startFieldDefs.map(f => ({ key: f.key, type: f.type, label: f.label })),
      targetNodeId: startId,
      targetArgKey: 'form_schema',
    })
  ]});
  messages.push(toolResult(c4, { success: true, schema: { fields: startFieldDefs } }));

  // propose_context_mapping → renvoie EXACTEMENT les startFields
  const c5 = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [toolCall(c5, 'propose_context_mapping', { targetId })] });
  messages.push(toolResult(c5, {
    success: true,
    upstreamOutputs: [{
      nodeId: startId,
      outputSchema: startFieldDefs.map(f => ({ key: f.key, type: f.type })),
      availableExpressions: startFieldDefs.map(f => ({
        field: f.key, expression: `{{ ${startId}.${f.key} }}`, type: f.type,
      })),
    }],
  }));

  // set_node_args target — 🛡️ Validation : toutes refs doivent être dans startFieldDefs
  const targetArgs = topic.targetArgs(startId);
  // Re-slugify les fields référencés pour matcher slugify des startFields
  const slugMap = Object.fromEntries(topic.startFields.map(fn => [fn, slugify(fn)]));
  const targetArgsClean = JSON.parse(JSON.stringify(targetArgs).replace(
    /\{\{\s*([a-zA-Z0-9_]+)\.([^\s}]+)\s*\}\}/g,
    (m, nId, field) => {
      // remplace les "field" non-slugifiés par leur version slug
      const slug = slugMap[field] || slugify(field);
      return `{{ ${nId}.${slug} }}`;
    }
  ));
  // VALIDATION : drop l'exemple si une ref pointe vers un field absent
  const allRefs = [];
  for (const v of Object.values(targetArgsClean)) {
    if (typeof v === 'string') extractRefs(v).forEach(r => allRefs.push(r));
    else if (typeof v === 'object' && v) {
      for (const inner of Object.values(v)) {
        if (typeof inner === 'string') extractRefs(inner).forEach(r => allRefs.push(r));
      }
    }
  }
  const validFieldKeys = new Set(startFieldDefs.map(f => f.key));
  const badRef = allRefs.find(r => r.nodeId === startId && !validFieldKeys.has(r.field));
  if (badRef) return null; // 🛡️ skip cet échantillon

  const c6 = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [
    toolCall(c6, 'set_node_args', { nodeId: targetId, args: targetArgsClean })
  ]});
  messages.push(toolResult(c6, { success: true }));

  // connect
  const c7 = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [
    toolCall(c7, 'connect_nodes', { sourceId: startId, targetId, sourceHandle: '0', targetHandle: 'in' })
  ]});
  messages.push(toolResult(c7, { success: true }));

  const c8 = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [toolCall(c8, 'save_flow', {})] });
  messages.push(toolResult(c8, { success: true }));
  messages.push({ role: 'assistant', content: `Workflow créé : start_form → ${topic.target} (flowId=${fId}).` });
  return messages;
}

// ─────────────────────────────────────────────────────────────────────
// GÉNÉRATEUR 3 : Workflow avec extraction (schema_builder dynamique)
// ─────────────────────────────────────────────────────────────────────
const EXTRACT_TOPICS = [
  { goal: 'Extraire nom + email depuis un texte', schema: [{ key: 'name', type: 'text', label: 'Nom' }, { key: 'email', type: 'email', label: 'Email' }] },
  { goal: 'Extraire prix + devise depuis facture', schema: [{ key: 'amount', type: 'number', label: 'Montant' }, { key: 'currency', type: 'text', label: 'Devise' }] },
  { goal: 'Extraire date + lieu événement', schema: [{ key: 'date', type: 'date', label: 'Date' }, { key: 'location', type: 'text', label: 'Lieu' }] },
  { goal: 'Classifier email', schema: [{ key: 'category', type: 'text', label: 'Catégorie' }, { key: 'priority', type: 'number', label: 'Priorité' }, { key: 'sentiment', type: 'text', label: 'Sentiment' }] },
];

function genWorkflowExtract() {
  const topic = rand(EXTRACT_TOPICS);
  const prompts = [
    `Workflow : ${topic.goal} via extraction IA`,
    `Crée un flow qui extrait ${topic.schema.map(s => s.label).join(', ')}`,
  ];
  const fId = newFlowId();
  const startId = uid('start_form');
  const extractId = uid('function_openai_extract');
  const startFields = [{ key: 'message', type: 'textarea', label: 'Texte à analyser' }];

  const messages = [
    { role: 'system', content: SYSTEM_SHORT },
    { role: 'user', content: rand(prompts) },
  ];
  let i = 0;
  const c1 = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [toolCall(c1, 'create_flow', { name: topic.goal })] });
  messages.push(toolResult(c1, { success: true, flowId: fId }));

  const c2 = callId(i++), c3 = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [
    toolCall(c2, 'add_node', { templateKey: 'start_form', title: 'Entrée texte' }),
    toolCall(c3, 'add_node', { templateKey: 'openai_extract', title: 'Extraction IA' }),
  ]});
  messages.push(toolResult(c2, { success: true, nodeId: startId }));
  messages.push(toolResult(c3, { success: true, nodeId: extractId }));

  // build form schema (champ `message`)
  const c4 = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [
    toolCall(c4, 'build_schema', { fields: startFields, targetNodeId: startId, targetArgKey: 'form_schema' })
  ]});
  messages.push(toolResult(c4, { success: true, schema: { fields: startFields } }));

  // build extraction_schema (le schéma typé attendu en sortie LLM)
  const c5 = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [
    toolCall(c5, 'build_schema', { fields: topic.schema, targetNodeId: extractId, targetArgKey: 'extraction_schema' })
  ]});
  messages.push(toolResult(c5, { success: true, schema: { fields: topic.schema } }));

  // set_node_args extract : text bindé sur start.message (✅ existe)
  const c6 = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [
    toolCall(c6, 'set_node_args', { nodeId: extractId, args: { text: `{{ ${startId}.message }}`, model: 'gpt-4o' } })
  ]});
  messages.push(toolResult(c6, { success: true }));

  const c7 = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [
    toolCall(c7, 'connect_nodes', { sourceId: startId, targetId: extractId, sourceHandle: '0', targetHandle: 'in' })
  ]});
  messages.push(toolResult(c7, { success: true }));
  const c8 = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [toolCall(c8, 'save_flow', {})] });
  messages.push(toolResult(c8, { success: true }));
  messages.push({ role: 'assistant', content: `Workflow d'extraction créé : ${topic.schema.length} champs typés.` });
  return messages;
}

// ─────────────────────────────────────────────────────────────────────
// GÉNÉRATEUR 4 : Workflow condition multi-output
// ─────────────────────────────────────────────────────────────────────
const CONDITION_TOPICS_V2 = [
  {
    goal: 'Router selon priorité',
    startFields: ['email', 'priorité', 'message'],
    branches: [
      { name: 'Urgent', condition: 'priorité > 8', action: 'slack_post_message', args: (s) => ({ channel: '#urgent', text: `🚨 {{ ${s}.message }}` }) },
      { name: 'Normal', condition: 'priorité >= 4', action: 'email_send', args: (s) => ({ to: `{{ ${s}.email }}`, subject: 'Reçu', body: `{{ ${s}.message }}` }) },
      { name: 'Faible', condition: 'priorité < 4', action: 'log_event', args: () => ({ event: 'low_priority' }) },
    ],
  },
  {
    goal: 'Trier par type de client',
    startFields: ['email', 'plan'],
    branches: [
      { name: 'Premium', condition: 'plan == "premium"', action: 'crm_create_task', args: (s) => ({ assignee: 'sales_lead', email: `{{ ${s}.email }}` }) },
      { name: 'Standard', condition: 'plan == "standard"', action: 'email_send', args: (s) => ({ to: `{{ ${s}.email }}`, subject: 'Bienvenue' }) },
    ],
  },
];

function genWorkflowCondition() {
  const topic = rand(CONDITION_TOPICS_V2);
  const prompts = [
    `Workflow conditionnel : ${topic.goal}`,
    `Crée un flow qui route selon ${topic.branches.map(b => b.name).join(' / ')}`,
  ];
  const fId = newFlowId();
  const startId = uid('start_form');
  const condId = uid('condition');
  const branchIds = topic.branches.map(b => ({ ...b, nodeId: uid(`function_${b.action}`), itemId: uid('cid') }));
  const startFieldDefs = topic.startFields.map(fn => buildFieldDef(fn));
  const validKeys = new Set(startFieldDefs.map(f => f.key));

  const messages = [
    { role: 'system', content: SYSTEM_SHORT },
    { role: 'user', content: rand(prompts) },
  ];
  let i = 0;
  const c1 = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [toolCall(c1, 'create_flow', { name: topic.goal })] });
  messages.push(toolResult(c1, { success: true, flowId: fId }));

  const adds = [
    toolCall(callId(i++), 'add_node', { templateKey: 'start_form', title: 'Source' }),
    toolCall(callId(i++), 'add_node', { templateKey: 'condition', title: 'Routage' }),
    ...branchIds.map(b => toolCall(callId(i++), 'add_node', { templateKey: b.action, title: b.name })),
  ];
  messages.push({ role: 'assistant', content: null, tool_calls: adds });
  messages.push(toolResult(adds[0].id, { success: true, nodeId: startId }));
  messages.push(toolResult(adds[1].id, { success: true, nodeId: condId }));
  branchIds.forEach((b, idx) => messages.push(toolResult(adds[2 + idx].id, { success: true, nodeId: b.nodeId })));

  // start_form schema
  const cSch = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [
    toolCall(cSch, 'build_schema', { fields: startFieldDefs.map(f => ({ key: f.key, type: f.type, label: f.label })), targetNodeId: startId, targetArgKey: 'form_schema' })
  ]});
  messages.push(toolResult(cSch, { success: true, schema: { fields: startFieldDefs } }));

  // condition node args
  const cCond = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [
    toolCall(cCond, 'set_node_args', {
      nodeId: condId,
      args: {
        items: branchIds.map(b => ({ _id: b.itemId, name: b.name, condition: b.condition.replace(/priorité/g, slugify('priorité')).replace(/plan/g, 'plan') })),
        else: { _id: uid('cid') },
      },
    })
  ]});
  messages.push(toolResult(cCond, { success: true }));

  // configure each branch
  for (const b of branchIds) {
    const args = b.args(startId);
    // Validate refs
    let valid = true;
    for (const v of Object.values(args)) {
      if (typeof v === 'string') for (const r of extractRefs(v)) {
        if (r.nodeId === startId && !validKeys.has(r.field)) { valid = false; break; }
      }
    }
    if (!valid) return null;
    const cA = callId(i++), cC = callId(i++);
    messages.push({ role: 'assistant', content: null, tool_calls: [
      toolCall(cA, 'set_node_args', { nodeId: b.nodeId, args }),
      toolCall(cC, 'connect_nodes', { sourceId: condId, targetId: b.nodeId, sourceHandle: b.itemId, targetHandle: 'in' }),
    ]});
    messages.push(toolResult(cA, { success: true }));
    messages.push(toolResult(cC, { success: true }));
  }

  const cInit = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [
    toolCall(cInit, 'connect_nodes', { sourceId: startId, targetId: condId, sourceHandle: '0', targetHandle: 'in' })
  ]});
  messages.push(toolResult(cInit, { success: true }));

  const cSave = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [toolCall(cSave, 'save_flow', {})] });
  messages.push(toolResult(cSave, { success: true }));
  messages.push({ role: 'assistant', content: `Workflow conditionnel : ${topic.branches.length} branches.` });
  return messages;
}

// ─────────────────────────────────────────────────────────────────────
// GÉNÉRATEUR 5 : Édition form
// ─────────────────────────────────────────────────────────────────────
function genFormEdit() {
  const topic = rand(FORM_TOPICS);
  const fId = newFormId();
  const newField = rand(['code_postal', 'date_naissance', 'pays', 'site_web']);
  const def = buildFieldDef(newField);
  const prompts = [
    `Ajoute un champ "${newField.replace(/_/g, ' ')}" au formulaire ${fId}`,
    `Sur ${fId}, rajoute ${newField}`,
  ];
  const messages = [
    { role: 'system', content: SYSTEM_SHORT },
    { role: 'user', content: rand(prompts) },
  ];
  let i = 0;
  const c1 = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [toolCall(c1, 'load_form', { formId: fId })] });
  messages.push(toolResult(c1, { success: true, formId: fId, name: topic.name, fieldCount: topic.fields.length }));
  const c2 = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [toolCall(c2, 'add_field', def)] });
  messages.push(toolResult(c2, { success: true, key: def.key }));
  const c3 = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [toolCall(c3, 'save_form', {})] });
  messages.push(toolResult(c3, { success: true, formId: fId }));
  messages.push({ role: 'assistant', content: `Champ "${def.label}" ajouté au formulaire.` });
  return messages;
}

// ─────────────────────────────────────────────────────────────────────
// GÉNÉRATEUR 6 : spawn_subagent (research, file_analyzer, parallel)
// ─────────────────────────────────────────────────────────────────────
const SUBAGENT_TOPICS = [
  {
    prompts: ['Cherche les concurrents de Stripe', 'Trouve-moi les concurrents de Stripe', 'Analyse les alternatives à Stripe'],
    parallel: false, type: 'research',
    subagentPrompt: 'Identifie les 3-5 principaux concurrents de Stripe avec leurs forces/faiblesses, parts de marché et différenciateurs clés.',
  },
  {
    prompts: ['Analyse les frameworks JS dashboard open-source 2026', 'Top 3 frameworks dashboard JS'],
    parallel: false, type: 'research',
    subagentPrompt: 'Identifie les 3 meilleurs frameworks JS open-source pour dashboard en 2026 (stars GitHub, licence, stack, points forts).',
  },
  {
    prompts: ['Extrait la charte de c4rbon.group', 'Récupère charte graphique site web'],
    parallel: false, type: 'file_analyzer',
    subagentPrompt: 'Va sur https://c4rbon.group, extrais la palette couleurs (HEX), les fonts, et télécharge le logo via web_download.',
  },
  {
    prompts: ['Cherche infos sur Acme + extrait charte de leur site', 'Recherche société Acme + analyse site web'],
    parallel: true,
    branches: [
      { type: 'research', subagentPrompt: 'Recherche en ligne la société Acme : activité, fondateurs, taille, faits marquants.' },
      { type: 'file_analyzer', subagentPrompt: 'Analyse https://acme.example pour extraire charte graphique : couleurs HEX, typographie, logo (via web_download).' },
    ],
  },
];

function genSubagentSpawn() {
  const topic = rand(SUBAGENT_TOPICS);
  const messages = [
    { role: 'system', content: SYSTEM_SHORT },
    { role: 'user', content: rand(topic.prompts) },
  ];
  let i = 0;

  // todo_write d'abord (bonne pratique Kinn pour les tâches multi-étapes)
  const cTodo = callId(i++);
  const todos = topic.parallel
    ? topic.branches.map((b, idx) => ({ id: `t${idx + 1}`, content: b.subagentPrompt.slice(0, 80), activeForm: `${b.type === 'research' ? 'Recherche' : 'Analyse fichier'}…`, status: idx === 0 ? 'in_progress' : 'pending' }))
    : [{ id: 't1', content: topic.subagentPrompt.slice(0, 80), activeForm: 'Lancement…', status: 'in_progress' }];
  messages.push({ role: 'assistant', content: null, tool_calls: [toolCall(cTodo, 'todo_write', { todos })] });
  messages.push(toolResult(cTodo, { success: true, stats: { total: todos.length, completed: 0, inProgress: todos.filter(t => t.status === 'in_progress').length } }));

  // spawn_subagent
  const cSpawn = callId(i++);
  if (topic.parallel) {
    const parallelArgs = topic.branches.map(b => ({ subagent_type: b.type, prompt: b.subagentPrompt }));
    messages.push({ role: 'assistant', content: null, tool_calls: [
      toolCall(cSpawn, 'spawn_subagent', { subagent_type: 'research', prompt: 'placeholder', parallel: parallelArgs, async: true })
    ]});
    messages.push(toolResult(cSpawn, {
      success: true,
      result: topic.branches.map((b, idx) => ({ ok: true, jobId: newJobId(), subagentType: b.type, depth: 1, status: 'queued', async: true })),
    }));
    messages.push({ role: 'assistant', content: `J'ai lancé ${topic.branches.length} sous-agents en parallèle. Je reviens avec leurs résultats pour la suite.` });
  } else {
    messages.push({ role: 'assistant', content: null, tool_calls: [
      toolCall(cSpawn, 'spawn_subagent', { subagent_type: topic.type, prompt: topic.subagentPrompt, async: true })
    ]});
    messages.push(toolResult(cSpawn, {
      success: true, result: { ok: true, jobId: newJobId(), subagentType: topic.type, depth: 1, status: 'queued', async: true },
    }));
    messages.push({ role: 'assistant', content: `Sous-agent ${topic.type} lancé en arrière-plan. Je reviens avec son rapport.` });
  }
  return messages;
}

// ─────────────────────────────────────────────────────────────────────
// GÉNÉRATEUR 7 : Génération DOCX (execute_code + python-docx)
// ─────────────────────────────────────────────────────────────────────
const DOCX_TOPICS = [
  {
    prompts: ['Génère un Word avec ce résumé', 'Fais-moi un docx récapitulatif', 'Crée un document Word'],
    title: 'Rapport hebdomadaire',
    sections: ['Synthèse', 'Indicateurs clés', 'Actions à mener'],
  },
  {
    prompts: ['Word avec la fiche client', 'Génère la fiche entreprise en Word'],
    title: 'Fiche entreprise Acme',
    sections: ['Identité légale', 'Activité', 'Contacts'],
  },
  {
    prompts: ['Doc Word de la charte graphique', 'Word qui présente la charte'],
    title: 'Charte graphique',
    sections: ['Palette de couleurs', 'Typographies', 'Logo'],
  },
];

function genDocxGeneration() {
  const topic = rand(DOCX_TOPICS);
  const fId = newFileId();
  const messages = [
    { role: 'system', content: SYSTEM_SHORT },
    { role: 'user', content: rand(topic.prompts) },
  ];
  let i = 0;
  // activate_capsule code_exec
  const cAct = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [
    toolCall(cAct, 'activate_capsule', { capsule: 'code_exec', reason: 'Génération .docx avec python-docx' })
  ]});
  messages.push(toolResult(cAct, { activated: true, newTools: ['execute_code'] }));

  // execute_code avec python-docx
  const code = `from docx import Document
from docx.shared import Pt, RGBColor, Cm
import os
os.makedirs('/workspace/out', exist_ok=True)
doc = Document()
title = doc.add_heading('${topic.title}', level=1)
${topic.sections.map(s => `doc.add_heading('${s}', level=2)\ndoc.add_paragraph('Contenu de la section ${s}.')`).join('\n')}
out_path = '/workspace/out/${slugify(topic.title)}.docx'
doc.save(out_path)
print('OK', out_path)`;

  const cExec = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [
    toolCall(cExec, 'execute_code', { language: 'python', code })
  ]});
  messages.push(toolResult(cExec, {
    stdout: `OK /workspace/out/${slugify(topic.title)}.docx\n`,
    exitCode: 0,
    duration: 180,
    producedFiles: [{ path: `out/${slugify(topic.title)}.docx`, fileId: fId, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 38000 }],
  }));

  // display_file inline
  const cDisp = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [
    toolCall(cDisp, 'display_file', { fileId: fId, widgetId: `docx-${slugify(topic.title)}`, caption: topic.title })
  ]});
  messages.push(toolResult(cDisp, { success: true, widgetId: `docx-${slugify(topic.title)}`, inlineMarker: `[[WIDGET:docx-${slugify(topic.title)}]]` }));
  messages.push({ role: 'assistant', content: `Document Word généré.\n\n[[WIDGET:docx-${slugify(topic.title)}]]` });
  return messages;
}

// ─────────────────────────────────────────────────────────────────────
// GÉNÉRATEUR 8 : Génération PPTX (execute_code + python-pptx)
// ─────────────────────────────────────────────────────────────────────
const PPTX_TOPICS = [
  { prompts: ['Génère une présentation pour ce sujet', 'Fais une pptx'], title: 'Pitch produit 2026', slides: ['Introduction', 'Problème', 'Solution', 'Marché', 'Roadmap'] },
  { prompts: ['Slide deck sur les frameworks dashboards', 'Présentation des frameworks'], title: 'Dashboard frameworks 2026', slides: ['Apache ECharts', 'Tremor', 'Cube'] },
];

function genPptxGeneration() {
  const topic = rand(PPTX_TOPICS);
  const fId = newFileId();
  const messages = [
    { role: 'system', content: SYSTEM_SHORT },
    { role: 'user', content: rand(topic.prompts) },
  ];
  let i = 0;
  const cAct = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [toolCall(cAct, 'activate_capsule', { capsule: 'code_exec', reason: 'Génération .pptx' })] });
  messages.push(toolResult(cAct, { activated: true, newTools: ['execute_code'] }));

  const code = `from pptx import Presentation
from pptx.util import Inches, Pt
import os
os.makedirs('/workspace/out', exist_ok=True)
prs = Presentation()
title_slide = prs.slides.add_slide(prs.slide_layouts[0])
title_slide.shapes.title.text = '${topic.title}'
${topic.slides.map(s => `slide = prs.slides.add_slide(prs.slide_layouts[1])\nslide.shapes.title.text = '${s}'\nslide.placeholders[1].text = 'Contenu ${s}'`).join('\n')}
out_path = '/workspace/out/${slugify(topic.title)}.pptx'
prs.save(out_path)
print('OK', out_path)`;

  const cExec = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [toolCall(cExec, 'execute_code', { language: 'python', code })] });
  messages.push(toolResult(cExec, {
    stdout: `OK /workspace/out/${slugify(topic.title)}.pptx\n`, exitCode: 0, duration: 220,
    producedFiles: [{ path: `out/${slugify(topic.title)}.pptx`, fileId: fId, mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', size: 52000 }],
  }));

  const cDisp = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [toolCall(cDisp, 'display_file', { fileId: fId, widgetId: `pptx-${slugify(topic.title)}`, caption: topic.title })] });
  messages.push(toolResult(cDisp, { success: true, widgetId: `pptx-${slugify(topic.title)}` }));
  messages.push({ role: 'assistant', content: `Présentation PPTX générée (${topic.slides.length + 1} slides).\n\n[[WIDGET:pptx-${slugify(topic.title)}]]` });
  return messages;
}

// ─────────────────────────────────────────────────────────────────────
// GÉNÉRATEUR 9 : render_structured (tableaux, card_grid, stepped_plan)
// ─────────────────────────────────────────────────────────────────────
function genRenderStructured() {
  const variants = [
    {
      prompts: ['Compare ces 3 options en tableau', 'Mets-moi un tableau comparatif'],
      layout: 'comparison_table',
      data: {
        columns: [
          { key: 'critere', header: 'Critère' },
          { key: 'a', header: 'Option A' },
          { key: 'b', header: 'Option B' },
          { key: 'c', header: 'Option C' },
        ],
        rows: [
          { label: 'Prix', critere: 'Prix', a: '10€/mo', b: '25€/mo', c: '50€/mo' },
          { label: 'Performance', critere: 'Performance', a: 'Moyenne', b: 'Bonne', c: 'Excellente' },
          { label: 'Support', critere: 'Support', a: 'Email', b: 'Chat', c: '24/7 Premium' },
        ],
      },
    },
    {
      prompts: ['Présente-moi un plan d\'action en étapes', 'Fais un plan stepped'],
      layout: 'stepped_plan',
      data: {
        steps: [
          { id: 's1', title: 'Cadrage', description: 'Définir objectifs et contraintes', duration: '1 jour' },
          { id: 's2', title: 'Conception', description: 'Architecture et mockups', duration: '3 jours' },
          { id: 's3', title: 'Développement', description: 'Implémentation', duration: '2 semaines' },
        ],
      },
    },
    {
      prompts: ['Grille de cards des features', 'Card grid récap'],
      layout: 'card_grid',
      data: {
        cards: [
          { title: 'Auth', description: 'SSO, MFA, gestion sessions' },
          { title: 'Workflows', description: 'Designer visuel + exécution' },
          { title: 'IA', description: 'Agents multi-providers' },
        ],
      },
    },
  ];
  const topic = rand(variants);
  const widgetId = `struct-${crypto.randomBytes(3).toString('hex')}`;
  const messages = [
    { role: 'system', content: SYSTEM_SHORT },
    { role: 'user', content: rand(topic.prompts) },
  ];
  let i = 0;
  const cR = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [
    toolCall(cR, 'render_structured', { layout: topic.layout, widgetId, title: 'Vue structurée', data: topic.data })
  ]});
  messages.push(toolResult(cR, { success: true, widgetId, inlineMarker: `[[WIDGET:${widgetId}]]` }));
  messages.push({ role: 'assistant', content: `Vue ${topic.layout} générée.\n\n[[WIDGET:${widgetId}]]` });
  return messages;
}

// ─────────────────────────────────────────────────────────────────────
// GÉNÉRATEUR 10 : Workflow avec LOOP (itération sur array)
// Pattern : extraction d'une liste → loop → action par item
// sourceHandle 'each' = sortie par itération, 'done' = fin
// Refs : {{ loop_id.item.field }} ou {{ loop_id.index }}
// ─────────────────────────────────────────────────────────────────────
const LOOP_TOPICS = [
  {
    goal: 'Envoyer un email à chaque contact d\'une liste',
    upstream: { template: 'airtable_list_records', outputField: 'records', itemFields: ['email', 'first_name', 'company'] },
    action: 'email_send',
    actionArgs: (loopId) => ({
      to: `{{ ${loopId}.item.email }}`,
      subject: 'Bienvenue',
      body: `Bonjour {{ ${loopId}.item.first_name }} de {{ ${loopId}.item.company }} !`,
    }),
  },
  {
    goal: 'Créer une issue Linear pour chaque bug détecté',
    upstream: { template: 'sentry_list_issues', outputField: 'issues', itemFields: ['title', 'description', 'severity'] },
    action: 'linear_create_issue',
    actionArgs: (loopId) => ({
      team: 'engineering',
      title: `{{ ${loopId}.item.title }}`,
      description: `{{ ${loopId}.item.description }}`,
      priority: `{{ ${loopId}.item.severity }}`,
    }),
  },
  {
    goal: 'Poster sur Slack une notif par commande Stripe',
    upstream: { template: 'stripe_list_charges', outputField: 'charges', itemFields: ['id', 'amount', 'customer_email'] },
    action: 'slack_post_message',
    actionArgs: (loopId) => ({
      channel: '#sales',
      text: `💰 Commande {{ ${loopId}.item.id }} : {{ ${loopId}.item.amount }}€ ({{ ${loopId}.item.customer_email }})`,
    }),
  },
  {
    goal: 'Sauvegarder chaque ligne d\'un CSV dans Notion',
    upstream: { template: 'parse_csv', outputField: 'rows', itemFields: ['name', 'email', 'role'] },
    action: 'notion_create_page',
    actionArgs: (loopId) => ({
      database: 'team-db',
      properties: {
        Nom: `{{ ${loopId}.item.name }}`,
        Email: `{{ ${loopId}.item.email }}`,
        Rôle: `{{ ${loopId}.item.role }}`,
      },
    }),
  },
];

function genWorkflowLoop() {
  const topic = rand(LOOP_TOPICS);
  const prompts = [
    `Workflow : ${topic.goal}`,
    `Crée un flow qui itère : ${topic.goal.toLowerCase()}`,
    `Pour chaque élément, ${topic.goal.toLowerCase().replace(/^(envoyer|créer|poster|sauvegarder)\s/, '$1 ')}`,
  ];
  const fId = newFlowId();
  const startId = uid('start');
  const upstreamId = uid(`function_${topic.upstream.template}`);
  const loopId = uid('loop');
  const actionId = uid(`function_${topic.action}`);

  const messages = [
    { role: 'system', content: SYSTEM_SHORT },
    { role: 'user', content: rand(prompts) },
  ];
  let i = 0;

  // create flow
  const c1 = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [toolCall(c1, 'create_flow', { name: topic.goal })] });
  messages.push(toolResult(c1, { success: true, flowId: fId }));

  // add 4 nodes en parallèle
  const c2 = callId(i++), c3 = callId(i++), c4 = callId(i++), c5 = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [
    toolCall(c2, 'add_node', { templateKey: 'start', title: 'Déclencheur' }),
    toolCall(c3, 'add_node', { templateKey: topic.upstream.template, title: 'Récupérer liste' }),
    toolCall(c4, 'add_node', { templateKey: 'loop', title: 'Pour chaque' }),
    toolCall(c5, 'add_node', { templateKey: topic.action, title: 'Action' }),
  ]});
  messages.push(toolResult(c2, { success: true, nodeId: startId }));
  messages.push(toolResult(c3, { success: true, nodeId: upstreamId }));
  messages.push(toolResult(c4, { success: true, nodeId: loopId }));
  messages.push(toolResult(c5, { success: true, nodeId: actionId }));

  // configure loop : iterate over upstream output array
  const cLoop = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [
    toolCall(cLoop, 'set_node_args', {
      nodeId: loopId,
      args: {
        items: `{{ ${upstreamId}.${topic.upstream.outputField} }}`,
        elementExpr: '{{ item }}',
      },
    })
  ]});
  messages.push(toolResult(cLoop, { success: true }));

  // configure action — refs vers loopId.item.field (✅ validé contre itemFields)
  const actionArgs = topic.actionArgs(loopId);
  // Validate
  const validItemFields = new Set(topic.upstream.itemFields);
  let valid = true;
  const validateValue = (v) => {
    if (typeof v === 'string') {
      for (const r of extractRefs(v)) {
        if (r.nodeId === loopId) {
          // {{ loopId.item.field }} → on parse "item.field" manuellement
          const m = v.match(new RegExp(`\\{\\{\\s*${loopId}\\.item\\.([a-zA-Z0-9_]+)\\s*\\}\\}`));
          if (m && !validItemFields.has(m[1])) valid = false;
        }
      }
    } else if (typeof v === 'object' && v) {
      for (const inner of Object.values(v)) validateValue(inner);
    }
  };
  for (const v of Object.values(actionArgs)) validateValue(v);
  if (!valid) return null;

  const cAct = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [
    toolCall(cAct, 'set_node_args', { nodeId: actionId, args: actionArgs })
  ]});
  messages.push(toolResult(cAct, { success: true }));

  // connect : start → upstream → loop (each → action) (done → end)
  const cC1 = callId(i++), cC2 = callId(i++), cC3 = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [
    toolCall(cC1, 'connect_nodes', { sourceId: startId, targetId: upstreamId, sourceHandle: '0', targetHandle: 'in' }),
    toolCall(cC2, 'connect_nodes', { sourceId: upstreamId, targetId: loopId, sourceHandle: '0', targetHandle: 'in' }),
    toolCall(cC3, 'connect_nodes', { sourceId: loopId, targetId: actionId, sourceHandle: 'each', targetHandle: 'in' }),
  ]});
  messages.push(toolResult(cC1, { success: true }));
  messages.push(toolResult(cC2, { success: true }));
  messages.push(toolResult(cC3, { success: true }));

  const cSave = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [toolCall(cSave, 'save_flow', {})] });
  messages.push(toolResult(cSave, { success: true }));
  messages.push({ role: 'assistant', content: `Workflow avec boucle créé : ${topic.upstream.template} → loop \`each\` → ${topic.action}.\nChaque item du tableau \`${topic.upstream.outputField}\` déclenche une exécution de l'action.` });
  return messages;
}

// ─────────────────────────────────────────────────────────────────────
// GÉNÉRATEUR 11 : Workflow avec TRIGGER (webhook / cron / polling / subscription)
// ─────────────────────────────────────────────────────────────────────
const TRIGGER_TOPICS = [
  // WEBHOOK : HTTP POST entrant
  {
    triggerType: 'webhook',
    goal: 'Recevoir un webhook Stripe et créer une facture',
    triggerTemplate: 'webhook_trigger',
    triggerArgs: { path: '/stripe-events', method: 'POST', secret: 'whsec_xxx' },
    triggerOutputs: ['headers', 'body', 'event_type'],
    action: 'invoice_create',
    actionArgs: (sId) => ({
      customer: `{{ ${sId}.body.customer_id }}`,
      amount: `{{ ${sId}.body.amount }}`,
      reference: `{{ ${sId}.body.event_id }}`,
    }),
  },
  // CRON : exécution périodique
  {
    triggerType: 'cron',
    goal: 'Rapport hebdomadaire chaque lundi 9h',
    triggerTemplate: 'cron_trigger',
    triggerArgs: { cron: '0 9 * * 1', timezone: 'Europe/Paris' },
    triggerOutputs: ['triggered_at', 'execution_id'],
    action: 'email_send',
    actionArgs: (sId) => ({
      to: 'team@company.com',
      subject: `Rapport hebdo - {{ ${sId}.triggered_at }}`,
      body: `Exécution #{{ ${sId}.execution_id }}`,
    }),
  },
  // POLLING : check périodique d'une API
  {
    triggerType: 'polling',
    goal: 'Surveiller nouveaux emails Gmail toutes les 5 minutes',
    triggerTemplate: 'gmail_poll_new_messages',
    triggerArgs: { interval: 300, query: 'is:unread label:inbox' },
    triggerOutputs: ['message_id', 'from', 'subject', 'snippet'],
    action: 'slack_post_message',
    actionArgs: (sId) => ({
      channel: '#mail-inbox',
      text: `📩 De {{ ${sId}.from }} : *{{ ${sId}.subject }}*\n> {{ ${sId}.snippet }}`,
    }),
  },
  // SUBSCRIPTION : événement temps réel via provider
  {
    triggerType: 'subscription',
    goal: 'Réagir aux messages Slack mentionnant @bot',
    triggerTemplate: 'slack_event_mention',
    triggerArgs: { event_type: 'app_mention' },
    triggerOutputs: ['user', 'channel', 'text', 'thread_ts'],
    action: 'openai_chat_completion',
    actionArgs: (sId) => ({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Tu es un assistant Slack.' },
        { role: 'user', content: `{{ ${sId}.text }}` },
      ],
    }),
  },
  {
    triggerType: 'subscription',
    goal: 'Notifier équipe quand un Stripe customer.subscription.created',
    triggerTemplate: 'stripe_event_subscription_created',
    triggerArgs: { event_type: 'customer.subscription.created' },
    triggerOutputs: ['customer_id', 'subscription_id', 'plan', 'amount'],
    action: 'slack_post_message',
    actionArgs: (sId) => ({
      channel: '#sales',
      text: `🎉 Nouvelle souscription !\nClient: {{ ${sId}.customer_id }}\nPlan: {{ ${sId}.plan }} ({{ ${sId}.amount }}€)`,
    }),
  },
];

function genWorkflowTrigger() {
  const topic = rand(TRIGGER_TOPICS);
  const prompts = [
    `Workflow déclenché par ${topic.triggerType} : ${topic.goal}`,
    `${topic.goal}`,
    `Crée un flow ${topic.triggerType} qui : ${topic.goal.toLowerCase()}`,
  ];
  const fId = newFlowId();
  const triggerId = uid(topic.triggerTemplate);
  const actionId = uid(`function_${topic.action}`);
  const triggerOutputFields = topic.triggerOutputs.map(k => ({ key: k, type: 'text' }));

  const messages = [
    { role: 'system', content: SYSTEM_SHORT },
    { role: 'user', content: rand(prompts) },
  ];
  let i = 0;

  const c1 = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [toolCall(c1, 'create_flow', { name: topic.goal })] });
  messages.push(toolResult(c1, { success: true, flowId: fId }));

  // add trigger node + action node
  const c2 = callId(i++), c3 = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [
    toolCall(c2, 'add_node', { templateKey: topic.triggerTemplate, title: `Déclencheur ${topic.triggerType}` }),
    toolCall(c3, 'add_node', { templateKey: topic.action, title: 'Action' }),
  ]});
  messages.push(toolResult(c2, { success: true, nodeId: triggerId }));
  messages.push(toolResult(c3, { success: true, nodeId: actionId }));

  // configure trigger args
  const cTrig = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [
    toolCall(cTrig, 'set_node_args', { nodeId: triggerId, args: topic.triggerArgs })
  ]});
  messages.push(toolResult(cTrig, { success: true }));

  // propose_context_mapping — montre les outputs du trigger
  const cMap = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [toolCall(cMap, 'propose_context_mapping', { targetId: actionId })] });
  messages.push(toolResult(cMap, {
    success: true,
    upstreamOutputs: [{
      nodeId: triggerId,
      outputSchema: triggerOutputFields,
      availableExpressions: triggerOutputFields.map(f => ({ field: f.key, expression: `{{ ${triggerId}.${f.key} }}`, type: f.type })),
    }],
  }));

  // configure action — validation des refs
  const actionArgs = topic.actionArgs(triggerId);
  const validKeys = new Set(topic.triggerOutputs);
  let valid = true;
  const validate = (v) => {
    if (typeof v === 'string') {
      // pour webhook: body.customer_id → accepte le pattern body.X aussi
      const all = [...v.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_.]+)\s*\}\}/g)];
      for (const m of all) {
        if (m[1] === triggerId) {
          const root = m[2].split('.')[0];
          if (!validKeys.has(root)) valid = false;
        }
      }
    } else if (Array.isArray(v)) v.forEach(validate);
    else if (typeof v === 'object' && v) Object.values(v).forEach(validate);
  };
  Object.values(actionArgs).forEach(validate);
  if (!valid) return null;

  const cAct = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [
    toolCall(cAct, 'set_node_args', { nodeId: actionId, args: actionArgs })
  ]});
  messages.push(toolResult(cAct, { success: true }));

  // connect
  const cConn = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [
    toolCall(cConn, 'connect_nodes', { sourceId: triggerId, targetId: actionId, sourceHandle: '0', targetHandle: 'in' })
  ]});
  messages.push(toolResult(cConn, { success: true }));

  // set_flow_trigger : marque le node comme trigger principal du flow
  const cSetTrig = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [
    toolCall(cSetTrig, 'set_flow_trigger', { triggerType: topic.triggerType, triggerNodeId: triggerId })
  ]});
  messages.push(toolResult(cSetTrig, {
    success: true,
    triggerType: topic.triggerType,
    ...(topic.triggerType === 'webhook' ? { webhookUrl: `https://kinn.app/api/hooks/${crypto.randomBytes(8).toString('hex')}` } : {}),
  }));

  const cSave = callId(i++);
  messages.push({ role: 'assistant', content: null, tool_calls: [toolCall(cSave, 'save_flow', {})] });
  messages.push(toolResult(cSave, { success: true }));

  const triggerExplain = {
    webhook: 'Le flow se déclenche à chaque POST sur l\'URL webhook générée.',
    cron: `Le flow s'exécute selon le cron \`${topic.triggerArgs.cron}\` (${topic.triggerArgs.timezone}).`,
    polling: `Le flow vérifie l'API toutes les ${topic.triggerArgs.interval}s.`,
    subscription: `Le flow réagit à l'événement \`${topic.triggerArgs.event_type}\` en temps réel.`,
  };
  messages.push({ role: 'assistant', content: `Workflow ${topic.triggerType} créé : ${topic.triggerTemplate} → ${topic.action}.\n${triggerExplain[topic.triggerType]}` });
  return messages;
}

// ─────────────────────────────────────────────────────────────────────
// GÉNÉRATEUR 12 : CAS D'ERREUR + récupération
// Le LLM apprend à corriger ses erreurs au lieu de boucler.
// ─────────────────────────────────────────────────────────────────────
const ERROR_SCENARIOS = [
  {
    // Erreur 1 : duplicate field key
    label: 'duplicate_field_key',
    genFlow: () => {
      const topic = rand(FORM_TOPICS);
      const fId = newFormId();
      const dupKey = slugify(topic.fields[0]);
      return {
        userPrompt: `Crée un form "${topic.name}" avec les champs : ${topic.fields.join(', ')}`,
        steps: [
          { tool: 'create_form', args: { name: topic.name }, result: { success: true, formId: fId } },
          { tool: 'add_field', args: buildFieldDef(topic.fields[0]), result: { success: true, key: dupKey } },
          // 2e ajout avec MÊME key → erreur
          { tool: 'add_field', args: { ...buildFieldDef(topic.fields[0]), label: 'Autre' }, result: { success: false, error: `field_key_exists`, message: `Une clé '${dupKey}' existe déjà.` } },
          // Correction : renomme la clé
          { tool: 'add_field', args: { ...buildFieldDef(topic.fields[0]), key: `${dupKey}_2`, label: 'Autre' }, result: { success: true, key: `${dupKey}_2` } },
          { tool: 'save_form', args: {}, result: { success: true, formId: fId } },
        ],
        final: `Formulaire créé. J'ai détecté un doublon de clé et renommé en \`${dupKey}_2\`.`,
      };
    },
  },
  {
    // Erreur 2 : invalid template key
    label: 'invalid_template_key',
    genFlow: () => {
      const fId = newFlowId();
      return {
        userPrompt: `Crée un workflow qui poste sur Slack`,
        steps: [
          { tool: 'create_flow', args: { name: 'Notif Slack' }, result: { success: true, flowId: fId } },
          { tool: 'add_node', args: { templateKey: 'slack_send', title: 'Slack' }, result: { success: false, error: 'template_not_found', message: 'Template "slack_send" introuvable. Suggestions : slack_post_message, slack_send_dm.' } },
          { tool: 'get_templates', args: { query: 'slack post' }, result: { success: true, templates: [{ key: 'slack_post_message', name: 'Post a message' }, { key: 'slack_send_dm', name: 'Send DM' }] } },
          { tool: 'add_node', args: { templateKey: 'slack_post_message', title: 'Post Slack' }, result: { success: true, nodeId: uid('function_slack_post_message') } },
          { tool: 'save_flow', args: {}, result: { success: true } },
        ],
        final: `Workflow créé. \`slack_send\` n'existait pas, j'ai utilisé \`slack_post_message\` à la place.`,
      };
    },
  },
  {
    // Erreur 3 : ref vers field inexistant
    label: 'invalid_field_ref',
    genFlow: () => {
      const fId = newFlowId();
      const startId = uid('start_form');
      const targetId = uid('function_email_send');
      return {
        userPrompt: `Workflow : envoyer email après formulaire`,
        steps: [
          { tool: 'create_flow', args: { name: 'Email après form' }, result: { success: true, flowId: fId } },
          { tool: 'add_node', args: { templateKey: 'start_form', title: 'Form' }, result: { success: true, nodeId: startId } },
          { tool: 'add_node', args: { templateKey: 'email_send', title: 'Email' }, result: { success: true, nodeId: targetId } },
          { tool: 'build_schema', args: { fields: [{ key: 'email', type: 'email', label: 'Email' }, { key: 'nom', type: 'text', label: 'Nom' }], targetNodeId: startId, targetArgKey: 'form_schema' }, result: { success: true } },
          // Tentative avec ref inexistante (.message n'existe pas dans le schéma)
          { tool: 'set_node_args', args: { nodeId: targetId, args: { to: `{{ ${startId}.email }}`, subject: 'Hello', body: `{{ ${startId}.message }}` } }, result: { success: false, error: 'invalid_reference', message: `Le champ "message" n'existe pas dans ${startId}. Champs disponibles : email, nom.` } },
          // Correction : utiliser .nom à la place
          { tool: 'set_node_args', args: { nodeId: targetId, args: { to: `{{ ${startId}.email }}`, subject: 'Hello', body: `Bonjour {{ ${startId}.nom }}` } }, result: { success: true } },
          { tool: 'connect_nodes', args: { sourceId: startId, targetId, sourceHandle: '0', targetHandle: 'in' }, result: { success: true } },
          { tool: 'save_flow', args: {}, result: { success: true } },
        ],
        final: `Workflow créé. J'avais référencé \`message\` qui n'existe pas, corrigé en \`nom\`.`,
      };
    },
  },
];

function genErrorRecovery() {
  const scenario = rand(ERROR_SCENARIOS);
  const flow = scenario.genFlow();
  const messages = [
    { role: 'system', content: SYSTEM_SHORT },
    { role: 'user', content: flow.userPrompt },
  ];
  let i = 0;
  for (const step of flow.steps) {
    const cid = callId(i++);
    messages.push({ role: 'assistant', content: null, tool_calls: [toolCall(cid, step.tool, step.args)] });
    messages.push(toolResult(cid, step.result));
  }
  messages.push({ role: 'assistant', content: flow.final });
  return messages;
}

// ─────────────────────────────────────────────────────────────────────
// MIX & WRITE
// ─────────────────────────────────────────────────────────────────────
// Helper layout : génère un add_node args avec position cascade
// Position x croît de 280px entre chaque node (canvas Kinn), y centré à 200.
function addNodeArgs(templateKey, title, indexInFlow) {
  return {
    templateKey, title,
    near: { x: 100 + indexInFlow * 280, y: 200 },
  };
}

const GENERATORS = [
  { fn: genFormCreation, weight: 18 },
  { fn: genWorkflowSimple, weight: 16 },
  { fn: genWorkflowExtract, weight: 8 },
  { fn: genWorkflowCondition, weight: 8 },
  { fn: genFormEdit, weight: 6 },
  { fn: genSubagentSpawn, weight: 10 },
  { fn: genDocxGeneration, weight: 8 },
  { fn: genPptxGeneration, weight: 5 },
  { fn: genRenderStructured, weight: 5 },
  { fn: genWorkflowLoop, weight: 8 },
  { fn: genWorkflowTrigger, weight: 10 },
  { fn: genErrorRecovery, weight: 8 },
];
function pickGen() {
  const total = GENERATORS.reduce((a, g) => a + g.weight, 0);
  let r = Math.random() * total;
  for (const g of GENERATORS) {
    r -= g.weight;
    if (r <= 0) return g.fn;
  }
  return GENERATORS[0].fn;
}

if (fs.existsSync(OUT)) fs.unlinkSync(OUT);
fs.writeFileSync(OUT, '');

const stats = { total: 0, skipped: 0, byType: {} };
let attempts = 0;
while (stats.total < TARGET && attempts < TARGET * 3) {
  attempts++;
  const gen = pickGen();
  const messages = gen();
  if (!messages) { stats.skipped++; continue; }
  appendSample(messages);
  stats.byType[gen.name] = (stats.byType[gen.name] || 0) + 1;
  stats.total++;
  if (stats.total % 200 === 0) console.log(`[gen] ${stats.total}/${TARGET}…`);
}

console.log(`\n✅ Dataset : ${OUT}`);
console.log(`   ${stats.total} samples écrits, ${stats.skipped} samples skippés (validation refs)`);
for (const [k, v] of Object.entries(stats.byType)) console.log(`   - ${k}: ${v}`);
console.log(`\n📦 Pour train LoRA : pointe ton trainer (Unsloth/Axolotl) sur ce .jsonl`);
