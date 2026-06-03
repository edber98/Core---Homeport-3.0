const { utils } = require('./utils');

module.exports = {
  async talkdesk_interaction_delete_interactions_elimination(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/omnichannel/interactions/{resource_type}";
    const resource_type = String(d.resource_type || '').trim();
    if (!resource_type) return { ok: false, error: 'resource_type requis.' };
    reqPath = reqPath.replace('{resource_type}', encodeURIComponent(resource_type));

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
