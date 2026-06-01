const { utils } = require('./utils');

module.exports = {
  async milvus_collection_flush_collection(node, msg, inputs, opts) {
    const d = inputs || {};
    const collectionName = String(d.collectionName || '').trim();
    if (!collectionName) return { ok: false, error: 'collectionName requis.' };

    const body = { collectionName };
    if (d.dbName) body.dbName = String(d.dbName);

    const res = await utils.providerRequest(opts, '/v2/vectordb/collections/flush', { method: 'POST', body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      id: collectionName,
      name: collectionName,
      url: '',
      status: 'flushed',
      created_at: '',
      updated_at: '',
      raw: r
    };
  }
};
