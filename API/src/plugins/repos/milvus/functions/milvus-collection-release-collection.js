const { utils } = require('./utils');

module.exports = {
  async milvus_collection_release_collection(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/vectordb/collections/release";
    

    const query = {};

    const headers = {};
    if (d.request_timeout !== undefined && d.request_timeout !== null && d.request_timeout !== '') headers["Request-Timeout"] = String(d.request_timeout);
    if (d.authorization !== undefined && d.authorization !== null && d.authorization !== '') headers["Authorization"] = String(d.authorization);

    const body = {};
    if (d.dbname !== undefined && d.dbname !== null && d.dbname !== '') {
      body["dbname"] = d.dbname;
    }
    if (d.collectionname !== undefined && d.collectionname !== null && d.collectionname !== '') {
      body["collectionname"] = d.collectionname;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};

