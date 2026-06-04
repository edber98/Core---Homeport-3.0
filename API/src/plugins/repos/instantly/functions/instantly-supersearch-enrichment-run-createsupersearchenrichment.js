const { utils } = require('./utils');

module.exports = {
  async instantly_supersearch_enrichment_run_createsupersearchenrichment(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/supersearch-enrichment";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.resource_id !== undefined && d.resource_id !== null && d.resource_id !== '') {
      body["resource_id"] = d.resource_id;
    }
    if (d.type !== undefined && d.type !== null && d.type !== '') {
      body["type"] = d.type;
    }
    if (d.limit !== undefined && d.limit !== null && d.limit !== '') {
      body["limit"] = d.limit;
    }
    if (d.filters !== undefined && d.filters !== null && d.filters !== '') {
      body["filters"] = d.filters;
    }
    if (d.custom_flow !== undefined && d.custom_flow !== null && d.custom_flow !== '') {
      body["custom_flow"] = d.custom_flow;
    }
    if (d.integration_actions !== undefined && d.integration_actions !== null && d.integration_actions !== '') {
      body["integration_actions"] = d.integration_actions;
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

