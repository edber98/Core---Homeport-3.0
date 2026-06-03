const { utils } = require('./utils');

module.exports = {
  async aircall_webhook_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/webhooks/{id}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;
    if (d.events_action !== undefined && d.events_action !== null && d.events_action !== '') query.events_action = d.events_action;

    let events;
    if (d.events !== undefined && d.events !== null && d.events !== '') {
      if (typeof d.events === 'object') events = d.events;
      else {
        try { events = JSON.parse(String(d.events)); } catch { return { ok: false, error: 'JSON invalide dans events.' }; }
      }
      if (!Array.isArray(events)) return { ok: false, error: 'events doit être un tableau JSON.' };
    }

    const body = {};
    if (d.url !== undefined && d.url !== null && d.url !== '') body.url = d.url;
    if (d.custom_name !== undefined && d.custom_name !== null && d.custom_name !== '') body.custom_name = d.custom_name;
    if (d.active !== undefined && d.active !== null && d.active !== '') body.active = Boolean(d.active);
    if (events !== undefined) body.events = events;

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
