const { toSnake, titleCase, pluralize } = require('./bulk-utils');

const EXCLUDED_SEGMENTS = new Set([
  'billing', 'billings', 'invoice', 'invoices', 'subscription', 'subscriptions', 'plan', 'plans',
  'payment', 'payments', 'payout', 'payouts', 'audit', 'audits', 'apikey', 'api_keys', 'keys',
  'token', 'tokens', 'oauth', 'sso', 'scim', 'rbac', 'role', 'roles', 'permission', 'permissions',
  'policy', 'policies', 'governance', 'compliance'
]);

const EXCLUDED_PATH_RE = [
  /\/admin(\/|$)/i,
  /\/security(\/|$)/i,
  /\/organization(s)?\/settings(\/|$)/i,
  /\/account(\/|$)/i,
  /\/internal(\/|$)/i
];

const CUSTOM_VERB_MAP = {
  publish: 'publish',
  unpublish: 'unpublish',
  archive: 'archive',
  restore: 'restore',
  search: 'search',
  query: 'query',
  run: 'run',
  execute: 'execute',
  trigger: 'trigger',
  deploy: 'deploy',
  cancel: 'cancel',
  retry: 'retry',
  approve: 'approve',
  reject: 'reject',
  assign: 'assign',
  move: 'move',
  send: 'send',
  comment: 'comment',
  comments: 'comment',
  tag: 'tag',
  tags: 'tag',
  webhook: 'webhook',
  webhooks: 'webhook'
};

const METHOD_ALLOW = new Set(['get', 'post', 'put', 'patch', 'delete']);

function isObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function normalizeSegment(seg) {
  return String(seg || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_{}-]+/g, '')
    .replace(/-/g, '_');
}

function isPathParam(seg) {
  return /^\{[^}]+\}$/.test(seg);
}

function stripVersionSegments(segments) {
  const out = [...segments];
  while (out.length) {
    const s = out[0];
    if (/^v\d+(?:_\d+)*$/.test(s) || s === 'beta' || s === 'api' || s === 'rest') {
      out.shift();
      continue;
    }
    break;
  }
  return out;
}

function singularizeWord(word) {
  const w = String(word || '').trim();
  if (!w) return w;
  if (w.endsWith('ies')) return `${w.slice(0, -3)}y`;
  if (w.endsWith('sses')) return w.slice(0, -2);
  if (w.endsWith('ses')) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

function detectResource(pathname) {
  const raw = String(pathname || '').split('/').filter(Boolean).map(normalizeSegment);
  const segments = stripVersionSegments(raw);
  const staticSegments = segments.filter((s) => s && !isPathParam(s));
  if (!staticSegments.length) return null;

  const last = staticSegments[staticSegments.length - 1];
  const prev = staticSegments.length > 1 ? staticSegments[staticSegments.length - 2] : null;
  const pathParts = segments;
  const endsWithParam = pathParts.length > 0 && isPathParam(pathParts[pathParts.length - 1]);

  let chosen = last;
  if (CUSTOM_VERB_MAP[last] && prev) chosen = prev;
  else if (endsWithParam && last) chosen = last;

  const key = toSnake(singularizeWord(chosen));
  if (!key) return null;

  return {
    key,
    pluralKey: toSnake(pluralize(key)),
    title: key,
    titlePlural: pluralize(key)
  };
}

function detectAction(pathname, method, operation = {}) {
  const m = String(method || '').toLowerCase();
  const raw = String(pathname || '').split('/').filter(Boolean).map(normalizeSegment);
  const segments = stripVersionSegments(raw);
  const staticSegments = segments.filter((s) => s && !isPathParam(s));
  const lastStatic = staticSegments.length ? staticSegments[staticSegments.length - 1] : '';
  const endsWithParam = segments.length > 0 && isPathParam(segments[segments.length - 1]);
  const text = `${operation.operationId || ''} ${operation.summary || ''} ${operation.description || ''}`.toLowerCase();

  if (CUSTOM_VERB_MAP[lastStatic]) {
    const action = CUSTOM_VERB_MAP[lastStatic];
    const actionKey = m === 'get' && action === 'webhook' ? 'list' : action;
    return { action: actionKey, actionKey };
  }

  const keywordMap = [
    ['search', /\b(search|find|lookup|query)\b/i],
    ['publish', /\bpublish\b/i],
    ['unpublish', /\bunpublish\b/i],
    ['archive', /\barchive\b/i],
    ['restore', /\brestore\b/i],
    ['assign', /\bassign\b/i],
    ['comment', /\bcomment\b/i],
    ['tag', /\btag\b/i],
    ['move', /\bmove\b/i],
    ['send', /\bsend\b/i],
    ['trigger', /\btrigger\b/i],
    ['run', /\b(run|execute)\b/i],
    ['deploy', /\bdeploy\b/i],
    ['cancel', /\bcancel\b/i],
    ['upsert', /\bupsert\b/i]
  ];

  for (const [key, re] of keywordMap) {
    if (re.test(text)) return { action: key, actionKey: key };
  }

  if (m === 'get') return { action: endsWithParam ? 'get' : 'list', actionKey: endsWithParam ? 'get' : 'list' };
  if (m === 'post') return { action: 'create', actionKey: 'create' };
  if (m === 'patch' || m === 'put') return { action: 'update', actionKey: 'update' };
  if (m === 'delete') return { action: 'delete', actionKey: 'delete' };

  return { action: 'custom', actionKey: 'custom' };
}

function basePathFromPath(pathname, actionKey) {
  const raw = String(pathname || '').split('/').filter(Boolean).map((s) => s.trim());
  const segments = stripVersionSegments(raw.map(normalizeSegment));

  let out = [...raw];
  if (segments.length && isPathParam(segments[segments.length - 1])) {
    out = out.slice(0, -1);
  }

  const lastNorm = segments.length ? segments[segments.length - 1] : '';
  if (CUSTOM_VERB_MAP[lastNorm]) {
    out = out.slice(0, -1);
  }

  if (!out.length) return '/';
  return `/${out.join('/')}`.replace(/\/+/g, '/');
}

function pathScore(pathname) {
  const p = String(pathname || '').toLowerCase();
  const depth = p.split('/').filter(Boolean).length;
  return depth;
}

function inferArgType(paramSchema) {
  const t = String((paramSchema && paramSchema.type) || '').toLowerCase();
  if (t === 'integer' || t === 'number') return 'number';
  if (t === 'boolean') return 'checkbox';
  if (t === 'array' || t === 'object') return 'json';
  return 'text';
}

function inferOutput(actionKey, method) {
  if (actionKey === 'list' || actionKey === 'search') return 'list';
  if (actionKey === 'get' || actionKey === 'create' || actionKey === 'update' || actionKey === 'upsert') return 'item';
  if (String(method || '').toLowerCase() === 'get') return 'item';
  return 'action_result';
}

function defaultFrenchNodeTitle(actionKey, resourceTitle, resourceTitlePlural) {
  const a = toSnake(actionKey);
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

function shouldExclude(pathname, includeRegexes, excludeRegexes) {
  const pathLc = String(pathname || '').toLowerCase();
  if (includeRegexes.some((re) => re.test(pathLc))) return { excluded: false };

  for (const re of excludeRegexes) {
    if (re.test(pathLc)) return { excluded: true, reason: `Exclu par motif: ${re}` };
  }

  for (const re of EXCLUDED_PATH_RE) {
    if (re.test(pathLc)) return { excluded: true, reason: `Surface non-automation: ${re}` };
  }

  const tokens = pathLc.split('/').filter(Boolean).map((s) => normalizeSegment(s));
  const matched = tokens.find((t) => EXCLUDED_SEGMENTS.has(t));
  if (matched) return { excluded: true, reason: `Surface exclue: ${matched}` };

  return { excluded: false };
}

function toRegexList(values) {
  return (Array.isArray(values) ? values : [])
    .map((v) => {
      try { return new RegExp(String(v), 'i'); }
      catch { return null; }
    })
    .filter(Boolean);
}

function buildSpecFromOpenApi(openapi, options = {}) {
  if (!isObject(openapi)) throw new Error('Spécification OpenAPI invalide (objet attendu).');
  if (!isObject(openapi.paths)) throw new Error('openapi.paths manquant.');

  const connector = toSnake(options.connector || options.name || 'provider');
  const providerKey = toSnake(options.providerKey || connector);
  const providerName = options.providerName || titleCase(providerKey);

  const includeRegexes = toRegexList(options.includePatterns);
  const excludeRegexes = toRegexList(options.excludePatterns);

  const resources = new Map();
  const excluded = [];
  const included = [];

  const paths = Object.keys(openapi.paths);
  for (const pathname of paths) {
    const pathItem = openapi.paths[pathname];
    if (!isObject(pathItem)) continue;

    for (const method of Object.keys(pathItem)) {
      const methodLc = String(method).toLowerCase();
      if (!METHOD_ALLOW.has(methodLc)) continue;

      const operation = pathItem[method];
      if (!isObject(operation)) continue;
      if (options.includeDeprecated !== true && operation.deprecated === true) {
        excluded.push({ method: methodLc.toUpperCase(), path: pathname, reason: 'Déprécié' });
        continue;
      }

      const exclusion = shouldExclude(pathname, includeRegexes, excludeRegexes);
      if (exclusion.excluded) {
        excluded.push({ method: methodLc.toUpperCase(), path: pathname, reason: exclusion.reason });
        continue;
      }

      const resource = detectResource(pathname);
      if (!resource) {
        excluded.push({ method: methodLc.toUpperCase(), path: pathname, reason: 'Ressource indétectable' });
        continue;
      }

      const detectedAction = detectAction(pathname, methodLc, operation);
      let actionKey = toSnake(detectedAction.actionKey || detectedAction.action || 'custom');
      if (!actionKey) actionKey = 'custom';
      const variant = toSnake(operation.operationId || operation.summary || `${methodLc}_${pathname}`)
        .replace(/^_+|_+$/g, '')
        .slice(0, 60);
      const key = `${actionKey}_${variant}`;

      const output = inferOutput(actionKey, methodLc);
      const args = [];
      const allParams = [
        ...(Array.isArray(pathItem.parameters) ? pathItem.parameters : []),
        ...(Array.isArray(operation.parameters) ? operation.parameters : [])
      ];

      const seenArgs = new Set();
      for (const p of allParams) {
        if (!isObject(p)) continue;
        const inKey = String(p.in || '').toLowerCase();
        if (inKey !== 'path' && inKey !== 'query') continue;
        const rawName = toSnake(p.name || '');
        if (!rawName || seenArgs.has(rawName)) continue;
        seenArgs.add(rawName);
        const type = inferArgType(p.schema || {});
        args.push({
          key: rawName,
          type,
          label: titleCase(rawName),
          description: p.description || `${inKey === 'path' ? 'Paramètre de chemin' : 'Paramètre de requête'} ${rawName}.`,
          required: !!p.required,
          in: inKey
        });
      }

      if (operation.requestBody && ['post', 'patch', 'put'].includes(methodLc)) {
        args.push({
          key: 'body',
          type: 'json',
          label: 'Payload',
          description: 'Corps JSON de la requête.',
          required: !!operation.requestBody.required,
          in: 'body'
        });
      }

      const action = {
        key,
        action: actionKey,
        method: methodLc.toUpperCase(),
        path: pathname,
        title: defaultFrenchNodeTitle(actionKey, resource.title, resource.titlePlural),
        output,
        args,
        disableDefaultArgs: args.length > 0
      };

      const resourceRow = resources.get(resource.key) || {
        key: resource.key,
        pluralKey: resource.pluralKey,
        title: resource.title,
        titlePlural: resource.titlePlural,
        basePath: basePathFromPath(pathname, actionKey),
        defaultActions: [],
        actions: []
      };

      if (!resourceRow.basePath || pathScore(resourceRow.basePath) > pathScore(basePathFromPath(pathname, actionKey))) {
        resourceRow.basePath = basePathFromPath(pathname, actionKey);
      }

      resourceRow.actions.push(action);
      resources.set(resource.key, resourceRow);
      included.push({ method: methodLc.toUpperCase(), path: pathname, resource: resource.key, action: action.key });
    }
  }

  const list = [...resources.values()]
    .map((r) => {
      const dedup = new Map();
      for (const a of r.actions) dedup.set(a.key, a);
      r.actions = [...dedup.values()];
      return r;
    })
    .filter((r) => r.actions.length > 0)
    .sort((a, b) => a.key.localeCompare(b.key));

  if (!list.length) {
    throw new Error('Aucun endpoint utile trouvé. Vérifie les patterns d’exclusion/inclusion.');
  }

  const spec = {
    connector,
    providerKey,
    providerName,
    resources: list
  };

  const coverage = {};
  for (const r of list) {
    const lifecycle = new Set();
    const methods = new Set();
    for (const a of r.actions) lifecycle.add(toSnake(a.action || a.key));
    for (const a of r.actions) methods.add(String(a.method || '').toUpperCase());
    const writeCandidate = methods.has('POST') || methods.has('PATCH') || methods.has('PUT') || methods.has('DELETE');
    coverage[r.key] = {
      actions: [...lifecycle].sort(),
      hasRead: lifecycle.has('list') || lifecycle.has('search') || lifecycle.has('get'),
      hasWrite: lifecycle.has('create') || lifecycle.has('update') || lifecycle.has('delete') || lifecycle.has('publish') || lifecycle.has('trigger') || lifecycle.has('run'),
      writeCandidate
    };
  }

  return {
    spec,
    report: {
      connector,
      providerKey,
      providerName,
      includedCount: included.length,
      excludedCount: excluded.length,
      resources: list.map((r) => ({ key: r.key, actions: r.actions.length })),
      coverage,
      included,
      excluded
    }
  };
}

module.exports = { buildSpecFromOpenApi };
