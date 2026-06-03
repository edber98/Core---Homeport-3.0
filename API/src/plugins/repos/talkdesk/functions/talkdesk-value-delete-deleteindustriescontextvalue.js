const { utils } = require('./utils');

module.exports = {
  async talkdesk_value_delete_deleteindustriescontextvalue(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/industries/contexts/{context_id}/values/{value_id}";
    const context_id = String(d.context_id || '').trim();
    if (!context_id) return { ok: false, error: 'context_id requis.' };
    reqPath = reqPath.replace('{context_id}', encodeURIComponent(context_id));
    const value_id = String(d.value_id || '').trim();
    if (!value_id) return { ok: false, error: 'value_id requis.' };
    reqPath = reqPath.replace('{value_id}', encodeURIComponent(value_id));

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
