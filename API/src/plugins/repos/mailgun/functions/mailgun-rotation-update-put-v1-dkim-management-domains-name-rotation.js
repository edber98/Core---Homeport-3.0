const { utils } = require('./utils');

module.exports = {
  async mailgun_rotation_update_put_v1_dkim_management_domains_name_rotation(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/dkim_management/domains/{name}/rotation";
    const name = String(d.name || '').trim();
    if (!name) return { ok: false, error: 'name requis.' };
    reqPath = reqPath.replace('{name}', encodeURIComponent(name));

    const query = {};

    const headers = {};

    const body = {};
    if (d.rotation_enabled !== undefined && d.rotation_enabled !== null && d.rotation_enabled !== '') {
      body["rotation_enabled"] = d.rotation_enabled;
    }
    if (d.rotation_interval !== undefined && d.rotation_interval !== null && d.rotation_interval !== '') {
      body["rotation_interval"] = d.rotation_interval;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body });
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

