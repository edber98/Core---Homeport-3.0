function str(v) {
  return String(v === undefined || v === null ? '' : v).trim();
}

function toNum(v, d) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function parseJson(v, label, fallback) {
  if (v === undefined || v === null || v === '') return fallback;
  if (typeof v === 'object') return v;
  try { return JSON.parse(String(v)); } catch { throw new Error(`JSON invalide dans ${label}.`); }
}

async function providerRequest(opts, path, options = {}) {
  const c = (opts && opts.credentials) || {};
  const apiKey = str(c.apiKey);
  if (!apiKey) return { ok: false, error: 'Clé API LlamaIndex manquante.' };

  const baseUrl = str(c.baseUrl || 'https://api.cloud.llamaindex.ai').replace(/\/+$/, '');
  const url = new URL(`${baseUrl}${path.startsWith('/') ? path : '/' + path}`);

  const query = options.query || {};
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  let res;
  try {
    res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined
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
      error: (data && (data.message || data.error || data.detail)) || `HTTP ${res.status}`,
      status: res.status,
      details: data
    };
  }

  return { ok: true, status: res.status, data };
}

function toItem(raw, fallbackName) {
  const r = raw || {};
  return {
    id: str(r.id || r.pipeline_id || r.document_id || r.session_id || r.file_id || ''),
    name: str(r.name || r.title || fallbackName || ''),
    url: str(r.url || ''),
    status: str(r.status || r.state || ''),
    created_at: str(r.created_at || r.createdAt || ''),
    updated_at: str(r.updated_at || r.updatedAt || ''),
    raw: r
  };
}

function listResult(payload, fallbackName) {
  const data = payload || {};
  const rawItems = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.results)
      ? data.results
      : Array.isArray(data.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];

  const items = rawItems.map((r) => toItem(r, fallbackName));
  return {
    ok: true,
    items,
    totalCount: Number(data.total || data.count || items.length),
    nextCursor: data.next_cursor || data.next || null,
    raw: data
  };
}

function itemResult(payload, fallbackName) {
  const data = payload || {};
  const item = toItem(data, fallbackName);
  return { ok: true, ...item };
}

function actionResult(message, payload, status = 200) {
  return { ok: true, status, message, raw: payload || null };
}

async function run(key, inputs, opts) {
  const d = inputs || {};
  try {
    if (key === 'llamaindex_pipeline_list') {
      const res = await providerRequest(opts, '/api/v1/pipelines', { method: 'GET' });
      if (!res.ok) return res;
      return listResult(res.data, 'pipeline');
    }

    if (key === 'llamaindex_pipeline_get') {
      const pipelineId = str(d.pipeline_id);
      if (!pipelineId) return { ok: false, error: 'pipeline_id requis.' };
      const res = await providerRequest(opts, `/api/v1/pipelines/${encodeURIComponent(pipelineId)}`, { method: 'GET' });
      if (!res.ok) return res;
      return itemResult(res.data, pipelineId);
    }

    if (key === 'llamaindex_pipeline_retrieve') {
      const pipelineId = str(d.pipeline_id);
      const query = str(d.retrievalQuery);
      if (!pipelineId || !query) return { ok: false, error: 'pipeline_id et query requis.' };
      const body = {
        query,
        top_k: toNum(d.top_k, undefined),
        filters: parseJson(d.filters, 'filters', undefined)
      };
      Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

      const res = await providerRequest(opts, `/api/v1/pipelines/${encodeURIComponent(pipelineId)}/retrieve`, {
        method: 'POST',
        body
      });
      if (!res.ok) return res;
      return listResult(res.data, pipelineId);
    }

    if (key === 'llamaindex_pipeline_documents_list') {
      const pipelineId = str(d.pipeline_id);
      if (!pipelineId) return { ok: false, error: 'pipeline_id requis.' };
      const res = await providerRequest(opts, `/api/v1/pipelines/${encodeURIComponent(pipelineId)}/documents`, { method: 'GET' });
      if (!res.ok) return res;
      return listResult(res.data, pipelineId);
    }

    if (key === 'llamaindex_pipeline_document_get') {
      const pipelineId = str(d.pipeline_id);
      const documentId = str(d.document_id);
      if (!pipelineId || !documentId) return { ok: false, error: 'pipeline_id et document_id requis.' };
      const res = await providerRequest(opts, `/api/v1/pipelines/${encodeURIComponent(pipelineId)}/documents/${encodeURIComponent(documentId)}`, { method: 'GET' });
      if (!res.ok) return res;
      return itemResult(res.data, documentId);
    }

    if (key === 'llamaindex_pipeline_document_chunks') {
      const pipelineId = str(d.pipeline_id);
      const documentId = str(d.document_id);
      if (!pipelineId || !documentId) return { ok: false, error: 'pipeline_id et document_id requis.' };
      const res = await providerRequest(opts, `/api/v1/pipelines/${encodeURIComponent(pipelineId)}/documents/${encodeURIComponent(documentId)}/chunks`, { method: 'GET' });
      if (!res.ok) return res;
      return listResult(res.data, documentId);
    }

    if (key === 'llamaindex_pipeline_sync') {
      const pipelineId = str(d.pipeline_id);
      if (!pipelineId) return { ok: false, error: 'pipeline_id requis.' };
      const res = await providerRequest(opts, `/api/v1/pipelines/${encodeURIComponent(pipelineId)}/sync`, { method: 'POST', body: {} });
      if (!res.ok) return res;
      return actionResult('Synchronisation lancée.', res.data, res.status);
    }

    if (key === 'llamaindex_pipeline_sync_cancel') {
      const pipelineId = str(d.pipeline_id);
      if (!pipelineId) return { ok: false, error: 'pipeline_id requis.' };
      const res = await providerRequest(opts, `/api/v1/pipelines/${encodeURIComponent(pipelineId)}/sync/cancel`, { method: 'POST', body: {} });
      if (!res.ok) return res;
      return actionResult('Synchronisation annulée.', res.data, res.status);
    }

    if (key === 'llamaindex_chat_create') {
      const body = parseJson(d.chatRequest, 'chatRequest', null);
      if (!body || typeof body !== 'object') return { ok: false, error: 'chatRequest JSON requis.' };
      const res = await providerRequest(opts, '/api/v1/chat', { method: 'POST', body });
      if (!res.ok) return res;
      return itemResult(res.data, 'chat');
    }

    if (key === 'llamaindex_chat_get') {
      const sessionId = str(d.session_id);
      if (!sessionId) return { ok: false, error: 'session_id requis.' };
      const res = await providerRequest(opts, `/api/v1/chat/${encodeURIComponent(sessionId)}`, { method: 'GET' });
      if (!res.ok) return res;
      return itemResult(res.data, sessionId);
    }

    if (key === 'llamaindex_chat_list') {
      const res = await providerRequest(opts, '/api/v1/chat', { method: 'GET' });
      if (!res.ok) return res;
      return listResult(res.data, 'chat');
    }

    if (key === 'llamaindex_chat_delete') {
      const sessionId = str(d.session_id);
      if (!sessionId) return { ok: false, error: 'session_id requis.' };
      const res = await providerRequest(opts, `/api/v1/chat/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
      if (!res.ok) return res;
      return actionResult('Session supprimée.', res.data, res.status);
    }

    if (key === 'llamaindex_pipeline_document_create') {
      const pipelineId = str(d.pipeline_id);
      const body = parseJson(d.documentRequest, 'documentRequest', null);
      if (!pipelineId || !body || typeof body !== 'object') return { ok: false, error: 'pipeline_id et documentRequest JSON requis.' };
      const res = await providerRequest(opts, `/api/v1/pipelines/${encodeURIComponent(pipelineId)}/documents`, { method: 'POST', body });
      if (!res.ok) return res;
      return itemResult(res.data, 'document');
    }

    if (key === 'llamaindex_pipeline_document_delete') {
      const pipelineId = str(d.pipeline_id);
      const documentId = str(d.document_id);
      if (!pipelineId || !documentId) return { ok: false, error: 'pipeline_id et document_id requis.' };
      const res = await providerRequest(opts, `/api/v1/pipelines/${encodeURIComponent(pipelineId)}/documents/${encodeURIComponent(documentId)}`, { method: 'DELETE' });
      if (!res.ok) return res;
      return actionResult('Document supprimé.', res.data, res.status);
    }

    return { ok: false, error: `Action inconnue: ${key}` };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { utils: { run, parseJson, providerRequest } };
