const { utils } = require('./utils');

module.exports = {
  async activecampaign_dealtasktype_update_deal_updatetasktype(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/dealTasktypes/{id}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.dealtasktype_title !== undefined && d.dealtasktype_title !== null && d.dealtasktype_title !== "") {
          if (!body["dealtasktype"] || typeof body["dealtasktype"] !== 'object' || Array.isArray(body["dealtasktype"])) body["dealtasktype"] = {};
          body["dealtasktype"]["title"] = d.dealtasktype_title;
        }
    if (d.dealtasktype_status !== undefined && d.dealtasktype_status !== null && d.dealtasktype_status !== "") {
          if (!body["dealtasktype"] || typeof body["dealtasktype"] !== 'object' || Array.isArray(body["dealtasktype"])) body["dealtasktype"] = {};
          body["dealtasktype"]["status"] = d.dealtasktype_status;
        }
    const requestBody = Object.keys(body).length ? body : undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body: requestBody });
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
