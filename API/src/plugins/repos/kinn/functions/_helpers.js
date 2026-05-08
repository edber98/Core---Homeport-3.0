// Helpers partagés par tous les handlers du plugin Kinn.
// Centralise l'auth, le fetch JSON, le parsing SSE pour le node streaming.

/**
 * Construit une fonction de fetch authentifiée vers une instance Kinn.
 * @param {object} opts - opts du handler (contient .credentials)
 * @returns {{baseUrl, apiToken, workspaceId, fetchKinn(path, options)}}
 */
// Mode local : helper async pour générer / récupérer le service token.
// Idempotent : si l'env var existe, on la lit ; sinon on génère via le service.
async function getLocalServiceCreds(creds) {
  const port = process.env.PORT || '5055';
  const baseUrl = String(process.env.KINN_LOCAL_BASE_URL || `http://localhost:${port}`).replace(/\/+$/, '');

  let apiToken = String(process.env.KINN_LOCAL_API_TOKEN || '');
  let defaultWorkspaceId = String(creds.workspaceId || process.env.KINN_LOCAL_WORKSPACE_ID || '');

  if (!apiToken) {
    // Fallback : on génère un service token à la volée si jamais le boot
    // n'a pas pu le faire (ex: seed pas encore lancé au moment du boot).
    try {
      const { ensureLocalServiceToken } = require('../../../../services/local-service-token');
      const result = await ensureLocalServiceToken();
      if (result && result.token) {
        apiToken = result.token;
        process.env.KINN_LOCAL_API_TOKEN = apiToken;
        if (result.workspaceId && !defaultWorkspaceId) {
          defaultWorkspaceId = result.workspaceId;
          process.env.KINN_LOCAL_WORKSPACE_ID = defaultWorkspaceId;
        }
      }
    } catch (e) {
      throw new Error(`Kinn local: impossible de générer un service token (${e?.message || e})`);
    }
  }

  if (!apiToken) {
    throw new Error('Kinn local: aucun service token disponible. Vérifie que MongoDB est connecté + qu\'au moins une company existe en DB.');
  }

  return { baseUrl, apiToken, defaultWorkspaceId };
}

async function buildKinnClient(opts) {
  const creds = (opts && opts.credentials) || {};
  const isLocal = creds.local === true || creds.local === 'true';

  let baseUrl, apiToken, defaultWorkspaceId;

  if (isLocal) {
    // Mode local : on préfère le PAT user auto-généré au moment de la sauvegarde
    // du credential (creds.apiToken). Fallback service token global si absent.
    const port = process.env.PORT || '5055';
    baseUrl = String(creds.baseUrl || process.env.KINN_LOCAL_BASE_URL || `http://localhost:${port}`).replace(/\/+$/, '');
    apiToken = String(creds.apiToken || '');
    defaultWorkspaceId = String(creds.workspaceId || process.env.KINN_LOCAL_WORKSPACE_ID || '');
    if (!apiToken) {
      const local = await getLocalServiceCreds(creds);
      apiToken = local.apiToken;
      if (!defaultWorkspaceId) defaultWorkspaceId = local.defaultWorkspaceId;
    }
    if (!apiToken) {
      throw new Error('Kinn local: aucun token disponible (PAT user manquant et service token indisponible).');
    }
  } else {
    baseUrl = String(creds.baseUrl || '').replace(/\/+$/, '');
    apiToken = String(creds.apiToken || '');
    defaultWorkspaceId = String(creds.workspaceId || '');
    if (!baseUrl) throw new Error('Kinn credentials: baseUrl manquant');
    if (!apiToken) throw new Error('Kinn credentials: apiToken manquant');
  }

  async function fetchKinn(path, options = {}) {
    const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
    const headers = {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    const res = await fetch(url, { ...options, headers });
    const ct = String(res.headers.get('content-type') || '');
    let body;
    try {
      body = ct.includes('application/json') ? await res.json() : await res.text();
    } catch { body = null; }
    if (!res.ok) {
      const errMsg = body && typeof body === 'object'
        ? (body.error || body.message || JSON.stringify(body))
        : String(body || `HTTP ${res.status}`);
      const err = new Error(`Kinn API ${res.status}: ${errMsg}`);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  }

  /**
   * Stream SSE depuis Kinn (utilisé par send_message).
   * Yield chaque event parsé { type, ... }.
   */
  async function* streamKinn(path, options = {}) {
    const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
    const headers = {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      ...(options.headers || {}),
    };
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Kinn stream ${res.status}: ${errText.slice(0, 300)}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const payload = trimmed.slice(6);
        if (payload === '[DONE]') {
          yield { type: 'done' };
          return;
        }
        try {
          yield JSON.parse(payload);
        } catch { /* ignore malformed */ }
      }
    }
  }

  return {
    baseUrl,
    apiToken,
    defaultWorkspaceId,
    fetchKinn,
    streamKinn,
    /** Retourne le workspaceId à utiliser : argument > défaut credentials. */
    resolveWorkspaceId(input) {
      return String((input && input.workspaceId) || defaultWorkspaceId || '');
    },
    /** Construit une URL avec workspaceId en query string. */
    withWs(path, wsId) {
      const sep = path.includes('?') ? '&' : '?';
      return wsId ? `${path}${sep}workspaceId=${encodeURIComponent(wsId)}` : path;
    },
  };
}

/** Réponse standard ok pour les handlers. */
function ok(payload = {}) { return { ok: true, ...payload }; }

/** Réponse standard error pour les handlers. */
function fail(error, extras = {}) {
  return { ok: false, error: typeof error === 'string' ? error : (error?.message || String(error)), ...extras };
}

module.exports = { buildKinnClient, ok, fail };
