const { utils } = require('./utils');

module.exports = {
  async customer_io_trigger_get_broadcaststatus(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/campaigns/{broadcast_id}/triggers/{trigger_id}";
    const broadcast_id = String(d.broadcast_id || '').trim();
    if (!broadcast_id) return { ok: false, error: 'broadcast_id requis.' };
    reqPath = reqPath.replace('{broadcast_id}', encodeURIComponent(broadcast_id));
    const trigger_id = String(d.trigger_id || '').trim();
    if (!trigger_id) return { ok: false, error: 'trigger_id requis.' };
    reqPath = reqPath.replace('{trigger_id}', encodeURIComponent(trigger_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'GET', query, body });
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
