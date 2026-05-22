const { utils } = require('./utils');

module.exports = {
  async talkdesk_trigger_trigger_deletetrigger(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/webhooks/triggers/{trigger_name}/{trigger_id}";
    const trigger_name = String(d.trigger_name || '').trim();
    if (!trigger_name) return { ok: false, error: 'trigger_name requis.' };
    reqPath = reqPath.replace('{trigger_name}', encodeURIComponent(trigger_name));
    const trigger_id = String(d.trigger_id || '').trim();
    if (!trigger_id) return { ok: false, error: 'trigger_id requis.' };
    reqPath = reqPath.replace('{trigger_id}', encodeURIComponent(trigger_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'DELETE', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
