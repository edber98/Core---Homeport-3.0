#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function toSnake(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function toKebab(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toCamel(value) {
  const s = toSnake(value);
  return s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function titleFromConnector(connector) {
  return String(connector || '')
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((x) => x[0].toUpperCase() + x.slice(1))
    .join(' ');
}

function parseArgs(argv) {
  const options = {
    force: false,
    dryRun: false,
    withSampleNode: true
  };
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      positional.push(a);
      continue;
    }
    if (a === '--force') {
      options.force = true;
      continue;
    }
    if (a === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (a === '--without-sample-node') {
      options.withSampleNode = false;
      continue;
    }

    const key = a.slice(2).replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      throw new Error(`Option --${key} requiert une valeur.`);
    }
    options[key] = next;
    i += 1;
  }

  if (positional.length === 0) throw new Error('Nom du connecteur manquant.');
  options.connector = positional[0];
  return options;
}

function defaultCredentials(providerTitle) {
  return {
    title: `Identifiants ${providerTitle}`,
    ui: { layout: 'vertical', labelsOnTop: true },
    fields: [
      {
        type: 'text',
        key: 'apiKey',
        label: 'Clé API',
        description: `Clé API ${providerTitle}.`,
        col: { xs: 24 },
        secret: true,
        validators: [{ type: 'required' }]
      },
      {
        type: 'text',
        key: 'baseUrl',
        label: 'URL de base API',
        description: `URL de base des endpoints ${providerTitle}.`,
        col: { xs: 24 },
        default: 'https://api.example.com'
      }
    ],
    displayTitle: false,
    displayDescription: false
  };
}

function buildManifest(config) {
  const connector = config.connector;
  const providerKey = toSnake(config.providerKey || connector);
  const providerTitle = config.providerName || titleFromConnector(connector);
  const label = config.label || providerTitle;

  const resultVar = `${providerKey}_action_result`;
  const nodeKey = `${providerKey}_health_ping`;
  const nodeName = toCamel(nodeKey);

  const providers = [
    {
      key: providerKey,
      name: providerTitle,
      title: providerTitle,
      iconClass: config.iconClass || 'fa-solid fa-puzzle-piece',
      iconUrl: config.iconUrl || `https://cdn.simpleicons.org/${toKebab(providerTitle)}`,
      color: config.color || '#f2f2f2',
      tags: config.tags && config.tags.length ? config.tags : [providerKey, 'automation'],
      categories: config.categories && config.categories.length ? config.categories : ['Productivité'],
      hasCredentials: true,
      credentialsForm: config.credentialsForm || defaultCredentials(providerTitle)
    }
  ];

  const nodeTemplates = [];
  if (config.withSampleNode !== false) {
    nodeTemplates.push({
      key: nodeKey,
      name: nodeName,
      schemaVersion: 2,
      title: 'Vérifier la connexion',
      subtitle: 'Utilitaires',
      icon: 'fa-solid fa-heart-pulse',
      type: 'function',
      nodeKind: 'function',
      category: providerTitle,
      providerKey,
      tags: [providerKey, 'healthcheck'],
      inputHandles: [{ id: 'in', name: 'In', type: 'any', accepts: ['any', 'payload'] }],
      outputHandles: [{ id: 'ok', name: 'Success', type: 'payload', schema: `$var:${resultVar}` }],
      authorize_catch_error: true,
      description: `Node de base ${providerTitle}: à remplacer par les actions métier.`,
      args: {
        title: 'Vérifier la connexion',
        ui: { layout: 'vertical', labelsOnTop: true },
        fields: [
          {
            type: 'text',
            key: 'message',
            label: 'Message',
            description: 'Message de test optionnel.',
            col: { xs: 24 },
            default: 'ok'
          }
        ],
        displayTitle: false,
        displayDescription: false
      },
      group: 'Utilitaires'
    });
  }

  return {
    repo: {
      name: connector,
      type: 'local',
      label
    },
    variables: {
      [resultVar]: {
        title: `Résultat ${providerTitle}`,
        ui: { layout: 'vertical', labelsOnTop: true },
        fields: [
          { type: 'checkbox', key: 'ok', label: 'Succès', description: 'Indique si la requête a réussi.', col: { xs: 24 } },
          { type: 'number', key: 'status', label: 'Code HTTP', description: 'Code de réponse HTTP.', col: { xs: 24 } },
          { type: 'text', key: 'message', label: 'Message', description: 'Message de statut.', col: { xs: 24 } },
          { type: 'json', key: 'raw', label: 'Données brutes', description: 'Réponse brute normalisée.', col: { xs: 24 } }
        ]
      }
    },
    providers,
    nodeTemplates
  };
}

function buildUtils() {
  return `async function providerRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const apiKey = credentials.apiKey;
  if (!apiKey) return { ok: false, error: 'Clé API manquante.' };

  const baseUrl = String(credentials.baseUrl || 'https://api.example.com').replace(/\\/+$/, '');
  const url = new URL(\`${'${baseUrl}'}\${path.startsWith('/') ? path : '/' + path}\`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }

  const headers = {
    'Authorization': \`Bearer ${'${apiKey}'}\`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  let res;
  try {
    res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    return {
      ok: false,
      error: data?.message || data?.error || \`HTTP ${'${res.status}'}\`,
      status: res.status,
      details: data
    };
  }

  return { ok: true, status: res.status, data };
}

module.exports = { utils: { providerRequest } };
`;
}

function buildSampleHandler(providerKey) {
  return `module.exports = {
  async ${providerKey}_health_ping(node, msg, inputs, opts) {
    const d = inputs || {};
    const message = String(d.message || 'ok');
    return {
      ok: true,
      status: 200,
      message,
      raw: { note: 'Placeholder scaffold. Remplacer ce node par les actions metier.' }
    };
  }
};
`;
}

function writeFile(filePath, content, force) {
  if (fs.existsSync(filePath) && !force) {
    throw new Error(`Fichier existe deja: ${filePath}. Utiliser --force pour ecraser.`);
  }
  fs.writeFileSync(filePath, content);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function scaffoldConnector(rawConfig, opts = {}) {
  const connector = toSnake(rawConfig.connector);
  if (!connector) throw new Error('Nom de connecteur invalide.');

  const root = opts.rootDir || process.cwd();
  const connectorDir = path.join(root, 'API', 'src', 'plugins', 'repos', connector);
  const functionsDir = path.join(connectorDir, 'functions');
  const manifestPath = path.join(connectorDir, 'manifest.json');
  const utilsPath = path.join(functionsDir, 'utils.js');

  const providerKey = toSnake(rawConfig.providerKey || connector);
  const sampleFile = `${providerKey}-health-ping.js`;
  const samplePath = path.join(functionsDir, sampleFile);

  const config = {
    connector,
    providerKey,
    providerName: rawConfig.providerName,
    label: rawConfig.label,
    iconClass: rawConfig.iconClass,
    iconUrl: rawConfig.iconUrl,
    color: rawConfig.color,
    withSampleNode: rawConfig.withSampleNode !== false,
    tags: rawConfig.tags,
    categories: rawConfig.categories,
    credentialsForm: rawConfig.credentialsForm
  };

  const manifest = buildManifest(config);
  const manifestContent = JSON.stringify(manifest, null, 2) + '\n';
  const utilsContent = buildUtils();
  const sampleContent = buildSampleHandler(providerKey);

  if (opts.dryRun) {
    return {
      connector,
      dryRun: true,
      files: [manifestPath, utilsPath].concat(config.withSampleNode ? [samplePath] : [])
    };
  }

  ensureDir(functionsDir);
  writeFile(manifestPath, manifestContent, !!opts.force);
  writeFile(utilsPath, utilsContent, !!opts.force);
  if (config.withSampleNode) writeFile(samplePath, sampleContent, !!opts.force);

  return {
    connector,
    dryRun: false,
    files: [manifestPath, utilsPath].concat(config.withSampleNode ? [samplePath] : [])
  };
}

function parseCsvList(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = scaffoldConnector({
      connector: args.connector,
      providerKey: args['provider-key'],
      providerName: args['provider-name'],
      label: args.label,
      iconClass: args['icon-class'],
      iconUrl: args['icon-url'],
      color: args.color,
      tags: parseCsvList(args.tags),
      categories: parseCsvList(args.categories),
      withSampleNode: args.withSampleNode
    }, {
      rootDir: process.cwd(),
      force: args.force,
      dryRun: args.dryRun
    });

    if (result.dryRun) {
      console.log(`[dry-run] ${result.connector}`);
      for (const f of result.files) console.log(`  - ${f}`);
      return;
    }

    console.log(`Scaffold cree: ${result.connector}`);
    for (const f of result.files) console.log(`  - ${f}`);
  } catch (e) {
    console.error(`Erreur: ${e.message}`);
    console.error('\nUsage:');
    console.error('  node .agents/skills/kinn-connector-creator/scripts/scaffold-connector.js <connector> [options]');
    console.error('Options:');
    console.error('  --provider-name "Provider Name"');
    console.error('  --provider-key provider_key');
    console.error('  --label "Label"');
    console.error('  --icon-url "https://..."');
    console.error('  --icon-class "fa-solid fa-puzzle-piece"');
    console.error('  --color "#f2f2f2"');
    console.error('  --tags "tag1,tag2"');
    console.error('  --categories "Productivité,CRM"');
    console.error('  --without-sample-node');
    console.error('  --force');
    console.error('  --dry-run');
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = {
  scaffoldConnector,
  toSnake,
  toCamel,
  titleFromConnector
};
