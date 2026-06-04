const { utils } = require('./utils');

module.exports = {
  async milvus_index_create_index(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/vectordb/indexes/create";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.dbname !== undefined && d.dbname !== null && d.dbname !== '') {
      body["dbname"] = d.dbname;
    }
    if (d.collectionname !== undefined && d.collectionname !== null && d.collectionname !== '') {
      body["collectionname"] = d.collectionname;
    }
    if (d.dimension !== undefined && d.dimension !== null && d.dimension !== '') {
      body["dimension"] = d.dimension;
    }
    if (d.metrictype !== undefined && d.metrictype !== null && d.metrictype !== '') {
      body["metrictype"] = d.metrictype;
    }
    if (d.primaryfield !== undefined && d.primaryfield !== null && d.primaryfield !== '') {
      body["primaryfield"] = d.primaryfield;
    }
    if (d.vectorfield !== undefined && d.vectorfield !== null && d.vectorfield !== '') {
      body["vectorfield"] = d.vectorfield;
    }
    if (d.description !== undefined && d.description !== null && d.description !== '') {
      body["description"] = d.description;
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

