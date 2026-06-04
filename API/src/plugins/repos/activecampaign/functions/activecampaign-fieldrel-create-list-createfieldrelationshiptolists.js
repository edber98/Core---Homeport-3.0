const { utils } = require('./utils');

module.exports = {
  async activecampaign_fieldrel_create_list_createfieldrelationshiptolists(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/fieldRels";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.fieldrel_field !== undefined && d.fieldrel_field !== null && d.fieldrel_field !== "") {
          if (!body["fieldrel"] || typeof body["fieldrel"] !== 'object' || Array.isArray(body["fieldrel"])) body["fieldrel"] = {};
          body["fieldrel"]["field"] = d.fieldrel_field;
        }
    if (d.fieldrel_relid !== undefined && d.fieldrel_relid !== null && d.fieldrel_relid !== "") {
          if (!body["fieldrel"] || typeof body["fieldrel"] !== 'object' || Array.isArray(body["fieldrel"])) body["fieldrel"] = {};
          body["fieldrel"]["relid"] = d.fieldrel_relid;
        }
    const requestBody = Object.keys(body).length ? body : undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body: requestBody });
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
