const { utils } = require('./utils');

module.exports = {
  async instantly_merge_create_mergeleads(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/leads/merge";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.lead_id !== undefined && d.lead_id !== null && d.lead_id !== '') {
      body["lead_id"] = d.lead_id;
    }
    if (d.destination_lead_id !== undefined && d.destination_lead_id !== null && d.destination_lead_id !== '') {
      body["destination_lead_id"] = d.destination_lead_id;
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

