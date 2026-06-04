const { utils } = require('./utils');

module.exports = {
  async milvus_partition_has_partition(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/vectordb/partitions/has";
    

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
    if (d.partitionname !== undefined && d.partitionname !== null && d.partitionname !== '') {
      body["partitionname"] = d.partitionname;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      id: r.id || r.uuid || r.key || '',
      name: r.name || r.title || '',
      url: r.url || r.html_url || '',
      status: r.status || r.state || '',
      created_at: r.created_at || r.createdAt || '',
      updated_at: r.updated_at || r.updatedAt || '',
      raw: r
    };
  }
};

