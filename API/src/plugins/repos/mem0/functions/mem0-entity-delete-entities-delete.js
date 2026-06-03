const { utils } = require('./utils');

module.exports = {
  async mem0_entity_delete_entities_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/entities/{entity_type}/{entity_id}/";
    const entity_type = String(d.entity_type || '').trim();
    if (!entity_type) return { ok: false, error: 'entity_type requis.' };
    reqPath = reqPath.replace('{entity_type}', encodeURIComponent(entity_type));
    const entity_id = String(d.entity_id || '').trim();
    if (!entity_id) return { ok: false, error: 'entity_id requis.' };
    reqPath = reqPath.replace('{entity_id}', encodeURIComponent(entity_id));

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
