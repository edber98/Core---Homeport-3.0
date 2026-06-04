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

function actionResult(message, raw) {
  return { ok: true, status: 200, message, raw: raw || null };
}

function listResult(items, raw) {
  return { ok: true, items, totalCount: items.length, nextCursor: null, raw: raw || items };
}

function itemResult(raw, fallbackName) {
  const r = raw || {};
  return {
    ok: true,
    id: str(r.id || r.name || ''),
    name: str(r.name || fallbackName || ''),
    url: '',
    status: str(r.status || ''),
    created_at: str(r.created_at || ''),
    updated_at: str(r.updated_at || ''),
    raw: r
  };
}

function normalizeList(items) {
  return (items || []).map((r) => ({
    id: str(r.id || ''),
    name: str(r.name || r.id || ''),
    url: '',
    status: str(r.status || ''),
    created_at: '',
    updated_at: '',
    raw: r
  }));
}

async function getClient(opts) {
  let ChromaClient;
  try {
    ({ ChromaClient } = require('chromadb'));
  } catch {
    throw new Error("Le package 'chromadb' n'est pas installé. Exécuter: npm i chromadb (dans API/).");
  }

  const c = (opts && opts.credentials) || {};
  const cfg = {};

  const path = str(c.path || c.baseUrl || '');
  const host = str(c.host || '');
  if (path) cfg.path = path;
  else if (host) {
    cfg.host = host;
    if (c.port !== undefined && c.port !== null && c.port !== '') cfg.port = Number(c.port);
    if (c.ssl === true || c.ssl === 'true') cfg.ssl = true;
  }

  if (c.tenant) cfg.tenant = String(c.tenant);
  if (c.database) cfg.database = String(c.database);

  const headers = parseJson(c.headers, 'headers', {}) || {};
  if (c.apiKey) headers.Authorization = `Bearer ${String(c.apiKey).trim()}`;
  if (Object.keys(headers).length) cfg.headers = headers;

  return new ChromaClient(cfg);
}

async function getCollection(client, collectionName) {
  if (!collectionName) throw new Error('collection_name requis.');
  return client.getCollection({ name: collectionName });
}

function rowsFromGetResult(data) {
  const ids = Array.isArray(data && data.ids) ? data.ids : [];
  const docs = Array.isArray(data && data.documents) ? data.documents : [];
  const mets = Array.isArray(data && data.metadatas) ? data.metadatas : [];
  const embs = Array.isArray(data && data.embeddings) ? data.embeddings : [];
  const rows = [];
  for (let i = 0; i < ids.length; i += 1) {
    rows.push({
      id: str(ids[i]),
      name: str(ids[i]),
      status: 'ok',
      document: docs[i],
      metadata: mets[i],
      embedding: embs[i]
    });
  }
  return rows;
}

function rowsFromQueryResult(data) {
  const idsList = Array.isArray(data && data.ids) ? data.ids : [];
  const docsList = Array.isArray(data && data.documents) ? data.documents : [];
  const metsList = Array.isArray(data && data.metadatas) ? data.metadatas : [];
  const distsList = Array.isArray(data && data.distances) ? data.distances : [];

  const rows = [];
  for (let q = 0; q < idsList.length; q += 1) {
    const ids = Array.isArray(idsList[q]) ? idsList[q] : [];
    const docs = Array.isArray(docsList[q]) ? docsList[q] : [];
    const mets = Array.isArray(metsList[q]) ? metsList[q] : [];
    const dists = Array.isArray(distsList[q]) ? distsList[q] : [];
    for (let i = 0; i < ids.length; i += 1) {
      rows.push({
        id: str(ids[i]),
        name: str(ids[i]),
        status: 'ok',
        queryIndex: q,
        distance: dists[i],
        document: docs[i],
        metadata: mets[i]
      });
    }
  }

  return rows;
}

async function run(key, inputs, opts) {
  const d = inputs || {};
  try {
    const client = await getClient(opts);

    if (key === 'chromadb_collection_list') {
      const out = await client.listCollections();
      return listResult(normalizeList((out || []).map((c) => ({ id: c.name || c.id || '', name: c.name || '', raw: c }))));
    }

    if (key === 'chromadb_collection_create') {
      const name = str(d.name);
      if (!name) return { ok: false, error: 'name requis.' };
      const metadata = parseJson(d.metadata, 'metadata', undefined);
      const getOrCreate = d.get_or_create === true;
      const col = await client.createCollection({ name, metadata, getOrCreate });
      return itemResult({ id: col.id || name, name: col.name || name, metadata: col.metadata || metadata }, name);
    }

    if (key === 'chromadb_collection_get') {
      const collectionName = str(d.collection_name);
      const col = await getCollection(client, collectionName);
      return itemResult({ id: col.id || collectionName, name: col.name || collectionName, metadata: col.metadata || {} }, collectionName);
    }

    if (key === 'chromadb_collection_update') {
      const collectionName = str(d.collection_name);
      const newName = str(d.new_name || '');
      const metadata = parseJson(d.metadata, 'metadata', undefined);
      const col = await getCollection(client, collectionName);
      await col.modify({ name: newName || undefined, metadata });
      const updated = await getCollection(client, newName || collectionName);
      return itemResult({ id: updated.id || (newName || collectionName), name: updated.name || (newName || collectionName), metadata: updated.metadata || {} }, newName || collectionName);
    }

    if (key === 'chromadb_collection_delete') {
      const collectionName = str(d.collection_name);
      if (!collectionName) return { ok: false, error: 'collection_name requis.' };
      await client.deleteCollection({ name: collectionName });
      return actionResult('Collection supprimée.', { collectionName });
    }

    if (key === 'chromadb_document_add') {
      const collectionName = str(d.collection_name);
      const col = await getCollection(client, collectionName);
      const payload = {
        ids: parseJson(d.ids, 'ids', []),
        documents: parseJson(d.documents, 'documents', undefined),
        embeddings: parseJson(d.embeddings, 'embeddings', undefined),
        metadatas: parseJson(d.metadatas, 'metadatas', undefined)
      };
      if (!Array.isArray(payload.ids) || !payload.ids.length) return { ok: false, error: 'ids doit être un tableau non vide.' };
      await col.add(payload);
      return actionResult('Documents ajoutés.', { collectionName, count: payload.ids.length });
    }

    if (key === 'chromadb_document_upsert') {
      const collectionName = str(d.collection_name);
      const col = await getCollection(client, collectionName);
      const payload = {
        ids: parseJson(d.ids, 'ids', []),
        documents: parseJson(d.documents, 'documents', undefined),
        embeddings: parseJson(d.embeddings, 'embeddings', undefined),
        metadatas: parseJson(d.metadatas, 'metadatas', undefined)
      };
      if (!Array.isArray(payload.ids) || !payload.ids.length) return { ok: false, error: 'ids doit être un tableau non vide.' };
      await col.upsert(payload);
      return actionResult('Documents upsertés.', { collectionName, count: payload.ids.length });
    }

    if (key === 'chromadb_document_get') {
      const collectionName = str(d.collection_name);
      const col = await getCollection(client, collectionName);
      const payload = {
        ids: parseJson(d.ids, 'ids', undefined),
        where: parseJson(d.where, 'where', undefined),
        whereDocument: parseJson(d.where_document, 'where_document', undefined),
        limit: d.limit !== undefined && d.limit !== null && d.limit !== '' ? Number(d.limit) : undefined,
        offset: d.offset !== undefined && d.offset !== null && d.offset !== '' ? Number(d.offset) : undefined
      };
      const out = await col.get(payload);
      const items = rowsFromGetResult(out).map((r) => ({ id: r.id, name: r.name, url: '', status: r.status, created_at: '', updated_at: '', raw: r }));
      return listResult(items, out);
    }

    if (key === 'chromadb_document_query') {
      const collectionName = str(d.collection_name);
      const col = await getCollection(client, collectionName);
      const payload = {
        queryTexts: parseJson(d.query_texts, 'query_texts', undefined),
        queryEmbeddings: parseJson(d.query_embeddings, 'query_embeddings', undefined),
        where: parseJson(d.where, 'where', undefined),
        whereDocument: parseJson(d.where_document, 'where_document', undefined),
        nResults: Math.max(1, Math.min(1000, toNum(d.n_results, 10)))
      };
      const out = await col.query(payload);
      const items = rowsFromQueryResult(out).map((r) => ({ id: r.id, name: r.name, url: '', status: r.status, created_at: '', updated_at: '', raw: r }));
      return listResult(items, out);
    }

    if (key === 'chromadb_document_update') {
      const collectionName = str(d.collection_name);
      const col = await getCollection(client, collectionName);
      const payload = {
        ids: parseJson(d.ids, 'ids', []),
        documents: parseJson(d.documents, 'documents', undefined),
        embeddings: parseJson(d.embeddings, 'embeddings', undefined),
        metadatas: parseJson(d.metadatas, 'metadatas', undefined)
      };
      if (!Array.isArray(payload.ids) || !payload.ids.length) return { ok: false, error: 'ids doit être un tableau non vide.' };
      await col.update(payload);
      return actionResult('Documents mis à jour.', { collectionName, count: payload.ids.length });
    }

    if (key === 'chromadb_document_delete') {
      const collectionName = str(d.collection_name);
      const col = await getCollection(client, collectionName);
      const payload = {
        ids: parseJson(d.ids, 'ids', undefined),
        where: parseJson(d.where, 'where', undefined),
        whereDocument: parseJson(d.where_document, 'where_document', undefined)
      };
      await col.delete(payload);
      return actionResult('Documents supprimés.', { collectionName, payload });
    }

    if (key === 'chromadb_document_count') {
      const collectionName = str(d.collection_name);
      const col = await getCollection(client, collectionName);
      const count = await col.count();
      return itemResult({ id: collectionName, name: collectionName, status: 'ok', count }, collectionName);
    }

    if (key === 'chromadb_document_peek') {
      const collectionName = str(d.collection_name);
      const col = await getCollection(client, collectionName);
      const limit = Math.max(1, Math.min(1000, toNum(d.limit, 10)));
      const out = await col.peek({ limit });
      const items = rowsFromGetResult(out).map((r) => ({ id: r.id, name: r.name, url: '', status: r.status, created_at: '', updated_at: '', raw: r }));
      return listResult(items, out);
    }

    return { ok: false, error: `Action inconnue: ${key}` };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function buildObjectFromFields(rows) {
  const object = {};
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = String(row && row.fieldKey || '').trim();
    if (!key) continue;
    let value = row.fieldValue;
    switch (row.fieldType || 'string') {
      case 'number': value = Number(value); if (Number.isNaN(value)) return { ok: false, error: `Nombre invalide pour ${key}.` }; break;
      case 'boolean': value = value === true || String(value).toLowerCase() === 'true'; break;
      case 'json': try { value = JSON.parse(String(value || 'null')); } catch { return { ok: false, error: `JSON invalide pour ${key}.` }; } break;
      case 'null': value = null; break;
      default: value = value == null ? '' : String(value);
    }
    object[key] = value;
  }
  return { ok: true, object };
}

module.exports = { utils: { run, parseJson, buildObjectFromFields } };
