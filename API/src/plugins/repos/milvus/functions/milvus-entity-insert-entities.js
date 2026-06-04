const { utils } = require('./utils');

module.exports = {
  async milvus_entity_insert_entities(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/vectordb/entities/insert";
    

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
    if (d.data !== undefined && d.data !== null && d.data !== '') {
      body["data"] = d.data;
    }
    if (d.partitionname !== undefined && d.partitionname !== null && d.partitionname !== '') {
      body["partitionname"] = d.partitionname;
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




