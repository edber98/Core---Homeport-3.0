const { utils } = require('./utils');

module.exports = {
  async front_teammate_create_add_view_teammates(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/views/{view_id}/teammates";
    const view_id = String(d.view_id || '').trim();
    if (!view_id) return { ok: false, error: 'view_id requis.' };
    reqPath = reqPath.replace('{view_id}', encodeURIComponent(view_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.teammate_ids !== undefined && d.teammate_ids !== null && d.teammate_ids !== '') {
      body["teammate_ids"] = d.teammate_ids;
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

