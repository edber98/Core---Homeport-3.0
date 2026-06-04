const { utils } = require('./utils');

module.exports = {
  async instantly_lead_label_create_createleadlabel(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/lead-labels";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.label !== undefined && d.label !== null && d.label !== '') {
      body["label"] = d.label;
    }
    if (d.interest_status_label !== undefined && d.interest_status_label !== null && d.interest_status_label !== '') {
      body["interest_status_label"] = d.interest_status_label;
    }
    if (d.description !== undefined && d.description !== null && d.description !== '') {
      body["description"] = d.description;
    }
    if (d.use_with_ai !== undefined && d.use_with_ai !== null && d.use_with_ai !== '') {
      body["use_with_ai"] = d.use_with_ai;
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

