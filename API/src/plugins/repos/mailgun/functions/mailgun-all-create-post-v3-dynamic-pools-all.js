const { utils } = require('./utils');

module.exports = {
  async mailgun_all_create_post_v3_dynamic_pools_all(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v3/dynamic_pools/all";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.good_reputation !== undefined && d.good_reputation !== null && d.good_reputation !== '') {
      body["good_reputation"] = d.good_reputation;
    }
    if (d.poor_reputation !== undefined && d.poor_reputation !== null && d.poor_reputation !== '') {
      body["poor_reputation"] = d.poor_reputation;
    }
    if (d.new_senders !== undefined && d.new_senders !== null && d.new_senders !== '') {
      body["new_senders"] = d.new_senders;
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

