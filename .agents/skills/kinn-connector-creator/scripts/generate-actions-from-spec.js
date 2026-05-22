#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  toSnake,
  toKebab,
  toCamel,
  titleCase,
  pluralize,
  ensureDir,
  readJson,
  writeJson,
  mergeByKey
} = require('./lib/bulk-utils');

const DEFAULT_ACTIONS = ['list', 'get', 'create', 'update', 'delete'];

function resolveActionKey(actionDef) {
  return toSnake(actionDef && (actionDef.key || actionDef.action || actionDef.name));
}

function parseArgs(argv) {
  const options = {
    force: false,
    dryRun: false,
    removeSampleNode: true
  };
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      positional.push(a);
      continue;
    }
    if (a === '--force') { options.force = true; continue; }
    if (a === '--dry-run') { options.dryRun = true; continue; }
    if (a === '--keep-sample-node') { options.removeSampleNode = false; continue; }

    const key = a.slice(2).replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) throw new Error(`Option --${key} requiert une valeur.`);
    options[key] = next;
    i += 1;
  }

  if (!options.spec) throw new Error('Option --spec requise.');
  if (positional[0]) options.connector = positional[0];
  return options;
}

function normalizeField(f) {
  const key = toSnake(f && (f.key || f.name));
  if (!key) return null;
  return {
    type: f.type || 'text',
    key,
    label: f.label || titleCase(key),
    description: f.description || '',
    required: !!f.required,
    in: f.in || null,
    default: f.default,
    options: Array.isArray(f.options) ? f.options : null
  };
}

function pathParams(pathTemplate) {
  const found = [];
  const re = /\{([a-zA-Z0-9_]+)\}/g;
  let m;
  while ((m = re.exec(pathTemplate))) found.push(toSnake(m[1]));
  return [...new Set(found)];
}

function defaultMethod(action) {
  const a = toSnake(action);
  if (a === 'list' || a === 'get' || a === 'search') return 'GET';
  if (a === 'create') return 'POST';
  if (a === 'update') return 'PATCH';
  if (a === 'delete') return 'DELETE';
  if (a === 'upsert') return 'POST';
  if (a === 'archive' || a === 'restore') return 'PATCH';
  return 'POST';
}

function defaultOutput(action) {
  const a = toSnake(action);
  if (a === 'list' || a === 'search') return 'list';
  if (a === 'get' || a === 'create' || a === 'update' || a === 'upsert') return 'item';
  return 'action_result';
}

function defaultTitle(action, resourceTitle, resourceTitlePlural) {
  const a = toSnake(action);
  if (a === 'list') return `Lister les ${resourceTitlePlural}`;
  if (a === 'search') return `Rechercher des ${resourceTitlePlural}`;
  if (a === 'get') return `Récupérer un ${resourceTitle}`;
  if (a === 'create') return `Créer un ${resourceTitle}`;
  if (a === 'update') return `Mettre à jour un ${resourceTitle}`;
  if (a === 'delete') return `Supprimer un ${resourceTitle}`;
  if (a === 'archive') return `Archiver un ${resourceTitle}`;
  if (a === 'restore') return `Restaurer un ${resourceTitle}`;
  if (a === 'upsert') return `Mettre à jour ou créer un ${resourceTitle}`;
  if (a === 'publish') return `Publier un ${resourceTitle}`;
  if (a === 'unpublish') return `Dépublier un ${resourceTitle}`;
  if (a === 'assign') return `Assigner un ${resourceTitle}`;
  if (a === 'move') return `Déplacer un ${resourceTitle}`;
  if (a === 'send') return `Envoyer un ${resourceTitle}`;
  if (a === 'comment') return `Commenter un ${resourceTitle}`;
  if (a === 'tag') return `Étiqueter un ${resourceTitle}`;
  if (a === 'trigger') return `Déclencher un ${resourceTitle}`;
  if (a === 'run' || a === 'execute') return `Exécuter un ${resourceTitle}`;
  if (a === 'deploy') return `Déployer un ${resourceTitle}`;
  if (a === 'cancel') return `Annuler un ${resourceTitle}`;
  if (a === 'retry') return `Relancer un ${resourceTitle}`;
  if (a === 'approve') return `Approuver un ${resourceTitle}`;
  if (a === 'reject') return `Rejeter un ${resourceTitle}`;
  if (a === 'query') return `Interroger les ${resourceTitlePlural}`;
  if (a === 'webhook') return `Recevoir des webhooks ${resourceTitlePlural}`;
  return `Exécuter ${titleCase(a.replace(/_/g, ' '))} sur ${resourceTitle}`;
}

function defaultIcon(action) {
  const a = toSnake(action);
  if (a === 'list') return 'fa-solid fa-list';
  if (a === 'search') return 'fa-solid fa-magnifying-glass';
  if (a === 'get') return 'fa-solid fa-eye';
  if (a === 'create') return 'fa-solid fa-plus';
  if (a === 'update') return 'fa-solid fa-pen';
  if (a === 'delete') return 'fa-solid fa-trash';
  if (a === 'archive') return 'fa-solid fa-box-archive';
  if (a === 'restore') return 'fa-solid fa-rotate-left';
  if (a === 'upsert') return 'fa-solid fa-code-compare';
  return 'fa-solid fa-bolt';
}

function defaultPath(action, basePath) {
  const a = toSnake(action);
  if (a === 'list' || a === 'search' || a === 'create') return basePath;
  if (a === 'upsert') return `${basePath}/upsert`;
  return `${basePath}/{id}`;
}

function expandActions(resourceDef) {
  const explicit = Array.isArray(resourceDef.actions) ? resourceDef.actions : [];
  const defaultList = Array.isArray(resourceDef.defaultActions) && resourceDef.defaultActions.length
    ? resourceDef.defaultActions
    : (explicit.length ? [] : DEFAULT_ACTIONS);

  const materialized = [];
  for (const a of defaultList) materialized.push({ key: toSnake(a), action: a });
  for (const a of explicit) materialized.push(a);

  const dedup = new Map();
  for (const actionDef of materialized) {
    const actionKey = resolveActionKey(actionDef);
    if (!actionKey) continue;
    dedup.set(actionKey, { ...actionDef, key: actionKey });
  }
  return [...dedup.values()];
}

function listSchemaFieldsFromItem(itemFields) {
  return [
    {
      type: 'section',
      title: 'Éléments',
      description: 'Liste des éléments',
      mode: 'array',
      key: 'items',
      array: { initialItems: 0, minItems: 0 },
      fields: itemFields.map((f) => ({ type: f.type, key: f.key, label: f.label, description: f.description || '', col: { xs: 24 } })),
      col: { xs: 24 }
    },
    { type: 'number', key: 'totalCount', label: 'Nombre total', description: 'Nombre total d’éléments.', col: { xs: 24 } },
    { type: 'text', key: 'nextCursor', label: 'Cursor suivant', description: 'Cursor de page suivant.', col: { xs: 24 } }
  ];
}

function makeItemFields(resourceDef) {
  const base = [
    { type: 'text', key: 'id', label: 'ID', description: 'Identifiant.' },
    { type: 'text', key: 'name', label: 'Nom', description: 'Nom.' },
    { type: 'text', key: 'url', label: 'URL', description: 'URL.' },
    { type: 'text', key: 'status', label: 'Statut', description: 'Statut.' },
    { type: 'date', key: 'created_at', label: 'Date création', description: 'Date de création.' },
    { type: 'date', key: 'updated_at', label: 'Date modification', description: 'Date de modification.' },
    { type: 'json', key: 'raw', label: 'Données brutes', description: 'Réponse API brute.' }
  ];

  const seen = new Set();
  const merged = [];
  for (const f of [...(resourceDef.fields || []), ...base]) {
    const nf = normalizeField(f);
    if (!nf || seen.has(nf.key)) continue;
    seen.add(nf.key);
    merged.push({ type: nf.type, key: nf.key, label: nf.label, description: nf.description || '' });
  }
  return merged;
}

function ensureVariable(manifest, key, title, fields) {
  if (!manifest.variables || typeof manifest.variables !== 'object') manifest.variables = {};
  manifest.variables[key] = {
    title,
    ui: { layout: 'vertical', labelsOnTop: true },
    fields: fields.map((f) => ({ ...f, col: f.col || { xs: 24 } }))
  };
}

function templateField(arg) {
  const f = {
    type: arg.type || 'text',
    key: arg.key,
    label: arg.label || titleCase(arg.key),
    description: arg.description || '',
    col: { xs: 24 }
  };
  if (arg.default !== undefined) f.default = arg.default;
  if (arg.options && Array.isArray(arg.options) && arg.options.length) f.options = arg.options;
  if (arg.required) f.validators = [{ type: 'required' }];
  return f;
}

function defaultArgsFor(actionKey, outputMode, pathTemplate, method) {
  const args = [];
  const params = pathParams(pathTemplate);
  for (const p of params) {
    args.push({ key: p, type: 'text', label: titleCase(p), description: `Valeur de chemin ${p}.`, required: true, in: 'path' });
  }

  if (actionKey === 'list' || actionKey === 'search') {
    args.push({ key: 'pageSize', type: 'number', label: 'Taille de page', description: 'Nombre max par page.', in: 'query', default: 50 });
    args.push({ key: 'page', type: 'number', label: 'Page', description: 'Numéro de page.', in: 'query' });
    if (actionKey === 'search') args.push({ key: 'search', type: 'text', label: 'Recherche', description: 'Texte de recherche.', in: 'query' });
  }

  if (outputMode === 'item' && actionKey === 'get' && !params.includes('id')) {
    args.push({ key: 'id', type: 'text', label: 'ID', description: 'Identifiant.', required: true, in: 'path' });
  }

  if (['POST', 'PATCH', 'PUT'].includes(method)) {
    const required = actionKey === 'create' || actionKey === 'upsert' || actionKey === 'custom';
    args.push({ key: 'body', type: 'json', label: 'Payload', description: 'Corps JSON de la requête.', required, in: 'body' });
  }

  return args;
}

function renderHandler(fnName, method, pathTemplate, outputMode) {
  const params = pathParams(pathTemplate);
  const pathLine = `let reqPath = ${JSON.stringify(pathTemplate)};`;

  const paramLines = params.map((p) => {
    return [
      `const ${p} = String(d.${p} || '').trim();`,
      `if (!${p}) return { ok: false, error: '${p} requis.' };`,
      `reqPath = reqPath.replace('{${p}}', encodeURIComponent(${p}));`
    ].join('\n    ');
  }).join('\n    ');

  const bodyBlock = ['POST', 'PATCH', 'PUT'].includes(method)
    ? `let body = undefined;
    if (d.body !== undefined && d.body !== null && d.body !== '') {
      if (typeof d.body === 'object') body = d.body;
      else {
        try { body = JSON.parse(String(d.body)); } catch { return { ok: false, error: 'JSON invalide dans body.' }; }
      }
    }`
    : `const body = undefined;`;

  let returnBlock;
  if (outputMode === 'list') {
    returnBlock = `const payload = res.data || {};
    const rawItems = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.results) ? payload.results : Array.isArray(payload) ? payload : [];
    const items = rawItems.map((r) => ({
      id: r && (r.id || r.uuid || r.key || ''),
      name: r && (r.name || r.title || ''),
      url: r && (r.url || r.html_url || ''),
      status: r && (r.status || r.state || ''),
      created_at: r && (r.created_at || r.createdAt || ''),
      updated_at: r && (r.updated_at || r.updatedAt || ''),
      raw: r
    }));

    return {
      ok: true,
      items,
      totalCount: Number(payload.total || payload.count || items.length),
      nextCursor: payload.next_cursor || payload.next || null
    };`;
  } else if (outputMode === 'item') {
    returnBlock = `const r = res.data || {};
    return {
      ok: true,
      id: r.id || r.uuid || r.key || '',
      name: r.name || r.title || '',
      url: r.url || r.html_url || '',
      status: r.status || r.state || '',
      created_at: r.created_at || r.createdAt || '',
      updated_at: r.updated_at || r.updatedAt || '',
      raw: r
    };`;
  } else {
    returnBlock = `return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };`;
  }

  return `const { utils } = require('./utils');

module.exports = {
  async ${fnName}(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    ${pathLine}
    ${paramLines}

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    ${bodyBlock}

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: '${method}', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    ${returnBlock}
  }
};
`;
}

function makeNodeTemplate(providerKey, providerTitle, resource, actionDef, args, schema) {
  const actionToken = resolveActionKey(actionDef) || 'custom';
  const actionVerb = toSnake(actionDef.action || actionToken);
  const resourceKey = toSnake(resource.key || resource.resource || resource.name);
  const resourceTitle = resource.title || titleCase(resourceKey);
  const resourceTitlePlural = resource.titlePlural || pluralize(resourceTitle);

  const templateKey = `${providerKey}_${resourceKey}_${actionToken}`;
  const templateName = toCamel(templateKey);
  const outputMode = actionDef.output || defaultOutput(actionVerb);

  return {
    key: templateKey,
    name: templateName,
    schemaVersion: 2,
    title: actionDef.title || defaultTitle(actionVerb, resourceTitle, resourceTitlePlural),
    subtitle: actionDef.subtitle || resourceTitlePlural,
    icon: actionDef.icon || defaultIcon(actionVerb),
    type: 'function',
    nodeKind: 'function',
    category: providerTitle,
    providerKey,
    tags: Array.isArray(actionDef.tags) && actionDef.tags.length ? actionDef.tags : [providerKey, resourceKey, actionVerb],
    inputHandles: [{ id: 'in', name: 'In', type: 'any', accepts: ['any', 'payload'] }],
    outputHandles: [{ id: 'ok', name: 'Success', type: 'payload', schema: `$var:${schema}` }],
    authorize_catch_error: true,
    description: actionDef.description || `Action ${actionVerb} sur ${resourceTitle}.`,
    args: {
      title: actionDef.title || defaultTitle(actionVerb, resourceTitle, resourceTitlePlural),
      ui: { layout: 'vertical', labelsOnTop: true },
      fields: args.map(templateField),
      displayTitle: false,
      displayDescription: false
    },
    group: actionDef.group || resource.group || resourceTitlePlural
  };
}

function uniqueValue(base, used, format) {
  const normalizedBase = String(base || '').trim();
  const start = normalizedBase || 'node';
  let candidate = start;
  let n = 2;
  while (used.has(candidate)) {
    candidate = format(start, n);
    n += 1;
  }
  used.add(candidate);
  return candidate;
}

function ensureUniqueNodeNamesAndTitles(manifest, providerKey) {
  const templates = Array.isArray(manifest.nodeTemplates) ? manifest.nodeTemplates : [];
  const nodes = templates.filter((t) => t && t.providerKey === providerKey);
  const usedNames = new Set();
  const usedTitles = new Set();

  for (const node of nodes) {
    node.name = uniqueValue(node.name || toCamel(node.key || 'node'), usedNames, (base, n) => `${base}${n}`);
    const uniqueTitle = uniqueValue(node.title || 'Action', usedTitles, (base, n) => `${base} (${n})`);
    node.title = uniqueTitle;
    if (node.args && typeof node.args === 'object') node.args.title = uniqueTitle;
  }
}

function generateFromSpec(specInput, opts = {}) {
  const spec = typeof specInput === 'string' ? readJson(path.resolve(process.cwd(), specInput)) : specInput;
  const connector = toSnake(opts.connector || spec.connector || spec.name || spec.key);
  if (!connector) throw new Error('connector manquant dans le spec.');

  const root = opts.rootDir || process.cwd();
  const connectorDir = path.join(root, 'API', 'src', 'plugins', 'repos', connector);
  const manifestPath = path.join(connectorDir, 'manifest.json');
  const functionsDir = path.join(connectorDir, 'functions');

  if (!fs.existsSync(manifestPath)) throw new Error(`Manifest introuvable: ${manifestPath}. Lance scaffold-connector.js d'abord.`);
  if (!fs.existsSync(functionsDir)) ensureDir(functionsDir);

  const manifest = readJson(manifestPath);
  const provider = Array.isArray(manifest.providers) && manifest.providers.length ? manifest.providers[0] : null;
  if (!provider || !provider.key) throw new Error('providers[0].key manquant dans manifest.');

  const providerKey = toSnake(spec.providerKey || provider.key);
  const providerTitle = spec.providerName || provider.title || provider.name || titleCase(providerKey);
  const resources = Array.isArray(spec.resources) ? spec.resources : [];
  if (!resources.length) throw new Error('spec.resources doit contenir au moins une ressource.');

  const files = [];
  const generatedKeys = [];

  ensureVariable(manifest, `${providerKey}_action_result`, 'Résultat action', [
    { type: 'checkbox', key: 'ok', label: 'Succès', description: 'Indique si l’action est réussie.' },
    { type: 'number', key: 'status', label: 'Code HTTP', description: 'Code HTTP retourné.' },
    { type: 'text', key: 'message', label: 'Message', description: 'Message de statut.' },
    { type: 'json', key: 'raw', label: 'Données brutes', description: 'Réponse API brute.' }
  ]);

  for (const resource of resources) {
    const resourceKey = toSnake(resource.key || resource.resource || resource.name);
    if (!resourceKey) continue;

    const resourceTitle = resource.title || titleCase(resourceKey);
    const resourceTitlePlural = resource.titlePlural || pluralize(resourceTitle);
    const pluralKey = toSnake(resource.pluralKey || pluralize(resourceKey));
    const basePath = resource.basePath || `/${pluralKey}`;

    const itemFields = makeItemFields(resource);
    ensureVariable(manifest, `${providerKey}_${resourceKey}`, `${resourceTitle} ${providerTitle}`, itemFields);
    ensureVariable(manifest, `${providerKey}_${pluralKey}`, `${resourceTitlePlural} ${providerTitle}`, listSchemaFieldsFromItem(itemFields));

    const actions = expandActions(resource);
    for (const actionRaw of actions) {
      const actionKey = resolveActionKey(actionRaw);
      if (!actionKey) continue;

      const method = String(actionRaw.method || defaultMethod(actionKey)).toUpperCase();
      const outputMode = actionRaw.output || defaultOutput(actionKey);
      const reqPath = actionRaw.path || defaultPath(actionKey, basePath);
      const args = [];

      const explicitArgs = Array.isArray(actionRaw.args) ? actionRaw.args.map(normalizeField).filter(Boolean) : [];
      const byKey = new Map();
      if (actionRaw.disableDefaultArgs !== true) {
        for (const a of defaultArgsFor(actionKey, outputMode, reqPath, method)) byKey.set(a.key, a);
      }
      for (const a of explicitArgs) byKey.set(a.key, { ...byKey.get(a.key), ...a });
      for (const a of byKey.values()) args.push(a);

      const schema = outputMode === 'list'
        ? `${providerKey}_${pluralKey}`
        : outputMode === 'item'
          ? `${providerKey}_${resourceKey}`
          : `${providerKey}_action_result`;

      const tpl = makeNodeTemplate(providerKey, providerTitle, resource, {
        ...actionRaw,
        key: actionKey,
        action: toSnake(actionRaw.action || actionKey),
        method,
        path: reqPath,
        output: outputMode
      }, args, schema);
      manifest.nodeTemplates = mergeByKey(manifest.nodeTemplates, tpl, 'key');

      const fnName = tpl.key;
      const fileName = `${connector}-${toKebab(resourceKey)}-${toKebab(actionKey)}.js`;
      const filePath = path.join(functionsDir, fileName);
      const content = renderHandler(fnName, method, reqPath, outputMode);

      if (!opts.dryRun) {
        if (fs.existsSync(filePath) && !opts.force) {
          throw new Error(`Fichier existe deja: ${filePath}. Utiliser --force pour ecraser.`);
        }
        fs.writeFileSync(filePath, content);
      }

      files.push(filePath);
      generatedKeys.push(tpl.key);
    }
  }

  if (opts.removeSampleNode) {
    const sampleKeys = new Set((manifest.nodeTemplates || []).filter((t) => /_health_ping$/.test(String(t.key || ''))).map((t) => t.key));
    manifest.nodeTemplates = (manifest.nodeTemplates || []).filter((t) => !sampleKeys.has(t.key));
  }

  ensureUniqueNodeNamesAndTitles(manifest, providerKey);

  if (!opts.dryRun) writeJson(manifestPath, manifest);

  return {
    connector,
    manifestPath,
    generatedKeys,
    files,
    dryRun: !!opts.dryRun
  };
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const out = generateFromSpec(args.spec, {
      connector: args.connector,
      rootDir: process.cwd(),
      force: args.force,
      dryRun: args.dryRun,
      removeSampleNode: args.removeSampleNode
    });

    if (out.dryRun) {
      console.log(`[dry-run] ${out.connector}`);
      console.log(`  - manifest: ${out.manifestPath}`);
      console.log(`  - nodes: ${out.generatedKeys.length}`);
      return;
    }

    console.log(`Actions générées pour ${out.connector}`);
    console.log(`Manifest: ${out.manifestPath}`);
    console.log(`Nodes: ${out.generatedKeys.length}`);
    for (const f of out.files) console.log(`  - ${f}`);
  } catch (e) {
    console.error(`Erreur: ${e.message}`);
    console.error('\nUsage:');
    console.error('  node .agents/skills/kinn-connector-creator/scripts/generate-actions-from-spec.js [connector] --spec <spec.json> [--force] [--dry-run] [--keep-sample-node]');
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { generateFromSpec };
