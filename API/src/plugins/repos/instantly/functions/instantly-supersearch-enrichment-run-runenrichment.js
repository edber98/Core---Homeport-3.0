const { utils } = require('./utils');

module.exports = {
  async instantly_supersearch_enrichment_run_runenrichment(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/supersearch-enrichment/run";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.resource_id !== undefined && d.resource_id !== null && d.resource_id !== '') {
      body["resource_id"] = d.resource_id;
    }
    if (d.lead_ids !== undefined && d.lead_ids !== null && d.lead_ids !== '') {
      body["lead_ids"] = d.lead_ids;
    }
    if (d.limit !== undefined && d.limit !== null && d.limit !== '') {
      body["limit"] = d.limit;
    }
    if (d.column_name !== undefined && d.column_name !== null && d.column_name !== '') {
      body["column_name"] = d.column_name;
    }
    if (d.overwrite !== undefined && d.overwrite !== null && d.overwrite !== '') {
      body["overwrite"] = d.overwrite;
    }
    if (d.starting_row !== undefined && d.starting_row !== null && d.starting_row !== '') {
      body["starting_row"] = d.starting_row;
    }
    if (d.count !== undefined && d.count !== null && d.count !== '') {
      body["count"] = d.count;
    }
    if (d.filters !== undefined && d.filters !== null && d.filters !== '') {
      body["filters"] = d.filters;
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

