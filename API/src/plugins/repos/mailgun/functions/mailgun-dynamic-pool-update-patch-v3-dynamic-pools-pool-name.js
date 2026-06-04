const { utils } = require('./utils');

module.exports = {
  async mailgun_dynamic_pool_update_patch_v3_dynamic_pools_pool_name(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v3/dynamic_pools/{pool_name}";
    const pool_name = String(d.pool_name || '').trim();
    if (!pool_name) return { ok: false, error: 'pool_name requis.' };
    reqPath = reqPath.replace('{pool_name}', encodeURIComponent(pool_name));

    const query = {};

    const headers = {};

    const body = {};
    if (d.add_ip !== undefined && d.add_ip !== null && d.add_ip !== '') {
      body["add_ip"] = d.add_ip;
    }
    if (d.remove_ip !== undefined && d.remove_ip !== null && d.remove_ip !== '') {
      body["remove_ip"] = d.remove_ip;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PATCH', query, body });
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

