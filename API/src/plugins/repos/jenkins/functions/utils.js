function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function parseJsonInput(value, label, defaultValue) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    throw new Error(`JSON invalide dans ${label}.`);
  }
}

function parseQueryString(input) {
  if (!input) return {};
  if (typeof input === 'object') return input;
  const out = {};
  const s = String(input);
  for (const pair of s.split('&')) {
    if (!pair.trim()) continue;
    const [k, v] = pair.split('=');
    if (!k) continue;
    out[decodeURIComponent(k)] = decodeURIComponent(v || '');
  }
  return out;
}

function toJobPath(jobPath) {
  const raw = String(jobPath || '').trim();
  if (!raw) throw new Error('jobPath requis.');
  if (raw.startsWith('/job/') || raw.startsWith('job/')) {
    return `/${raw.replace(/^\/+/, '')}`;
  }
  const parts = raw.split('/').map((x) => x.trim()).filter(Boolean);
  if (!parts.length) throw new Error('jobPath invalide.');
  return `/${parts.map((p) => `job/${encodeURIComponent(p)}`).join('/')}`;
}

function toObjectPath(objectPath) {
  const raw = String(objectPath || '').trim();
  if (!raw) return '';
  if (raw.startsWith('/')) return raw;
  if (raw.startsWith('job/') || raw.startsWith('view/')) return `/${raw}`;
  const parts = raw.split('/').map((x) => x.trim()).filter(Boolean);
  if (!parts.length) return '';
  return `/${parts.map((p) => `job/${encodeURIComponent(p)}`).join('/')}`;
}

function basicAuth(credentials) {
  const username = String(credentials.username || '').trim();
  const apiToken = String(credentials.apiToken || '').trim();
  if (!username || !apiToken) return null;
  return `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`;
}

async function getCrumb(opts) {
  const credentials = asObject(opts && opts.credentials);
  const baseUrl = String(credentials.baseUrl || '').trim().replace(/\/+$/, '');
  if (!baseUrl) return { ok: false, error: 'URL Jenkins manquante.' };

  const headers = { Accept: 'application/json' };
  const auth = basicAuth(credentials);
  if (auth) headers.Authorization = auth;

  const url = `${baseUrl}/crumbIssuer/api/json`;
  let res;
  try {
    res = await fetch(url, { method: 'GET', headers });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  if (!res.ok) {
    return { ok: false, status: res.status, error: `Impossible de récupérer le crumb (HTTP ${res.status}).` };
  }

  let data;
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: 'Réponse crumb non JSON.' };
  }

  if (!data || !data.crumbRequestField || !data.crumb) {
    return { ok: false, error: 'Crumb incomplet.' };
  }

  return { ok: true, field: data.crumbRequestField, crumb: data.crumb };
}

async function jenkinsRequest(opts, path, options = {}) {
  const credentials = asObject(opts && opts.credentials);
  const baseUrl = String(credentials.baseUrl || '').trim().replace(/\/+$/, '');
  if (!baseUrl) return { ok: false, error: 'URL Jenkins manquante.' };

  const url = new URL(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`);
  const query = asObject(options.query);
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    url.searchParams.set(k, String(v));
  }

  const method = String(options.method || 'GET').toUpperCase();
  const headers = {
    Accept: options.accept || 'application/json',
    ...(asObject(options.headers))
  };

  const auth = basicAuth(credentials);
  if (auth) headers.Authorization = auth;

  const needsCrumb = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && options.withCrumb !== false;
  if (needsCrumb && !credentials.disableCrumb) {
    const crumbRes = await getCrumb(opts);
    if (crumbRes.ok) {
      headers[crumbRes.field] = crumbRes.crumb;
    } else if (credentials.requireCrumb) {
      return { ok: false, error: crumbRes.error, status: crumbRes.status };
    }
  }

  let body;
  if (options.rawBody !== undefined) {
    body = options.rawBody;
    if (!headers['Content-Type']) headers['Content-Type'] = options.contentType || 'text/plain';
  } else if (options.body !== undefined) {
    body = JSON.stringify(options.body);
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  }

  let res;
  try {
    res = await fetch(url, { method, headers, body, redirect: 'follow' });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const contentType = String(res.headers.get('content-type') || '').toLowerCase();
  const location = res.headers.get('location') || null;

  let data = null;
  let text = '';
  try {
    if (options.responseType === 'text' || contentType.includes('xml') || contentType.includes('text/plain')) {
      text = await res.text();
      data = text;
    } else {
      text = await res.text();
      if (!text) data = null;
      else {
        try { data = JSON.parse(text); } catch { data = text; }
      }
    }
  } catch {
    data = null;
  }

  if (!res.ok) {
    const error = (data && data.message) || (typeof data === 'string' && data) || `HTTP ${res.status}`;
    return { ok: false, status: res.status, error, details: data, location };
  }

  return { ok: true, status: res.status, data, text, location };
}

function mapJob(item) {
  const x = asObject(item);
  return {
    name: x.name || '',
    full_name: x.fullName || x.full_name || x.name || '',
    url: x.url || '',
    color: x.color || '',
    buildable: !!x.buildable,
    in_queue: !!x.inQueue,
    last_build_number: x.lastBuild && x.lastBuild.number ? Number(x.lastBuild.number) : null,
    last_build_url: x.lastBuild && x.lastBuild.url ? x.lastBuild.url : '',
    next_build_number: x.nextBuildNumber ? Number(x.nextBuildNumber) : null,
    description: x.description || '',
    raw: x
  };
}

function mapBuild(item) {
  const x = asObject(item);
  return {
    id: x.id || '',
    number: x.number !== undefined ? Number(x.number) : null,
    url: x.url || '',
    result: x.result || '',
    status: x.result || (x.building ? 'BUILDING' : ''),
    building: !!x.building,
    duration: x.duration !== undefined ? Number(x.duration) : null,
    estimated_duration: x.estimatedDuration !== undefined ? Number(x.estimatedDuration) : null,
    timestamp: x.timestamp ? new Date(Number(x.timestamp)).toISOString() : '',
    queue_id: x.queueId !== undefined ? Number(x.queueId) : null,
    description: x.description || '',
    display_name: x.fullDisplayName || x.displayName || '',
    raw: x
  };
}

function mapQueueItem(item) {
  const x = asObject(item);
  const executable = asObject(x.executable);
  const task = asObject(x.task);
  return {
    id: x.id !== undefined ? Number(x.id) : null,
    url: x.url || '',
    task_name: task.name || '',
    task_url: task.url || '',
    why: x.why || '',
    blocked: !!x.blocked,
    stuck: !!x.stuck,
    build_number: executable.number !== undefined ? Number(executable.number) : null,
    build_url: executable.url || '',
    cancelled: !!x.cancelled,
    raw: x
  };
}

module.exports = {
  utils: {
    parseJsonInput,
    parseQueryString,
    toJobPath,
    toObjectPath,
    jenkinsRequest,
    mapJob,
    mapBuild,
    mapQueueItem
  }
};
