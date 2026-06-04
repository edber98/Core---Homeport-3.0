const { utils } = require('./utils');

module.exports = {
  async activecampaign_bulk_create_field_createcustomfieldoptions(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/fieldOption/bulk";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.field !== undefined && d.field !== null && d.field !== "") {
          body["field"] = d.field;
        }
    if (d.label !== undefined && d.label !== null && d.label !== "") {
          body["label"] = d.label;
        }
    if (d.value !== undefined && d.value !== null && d.value !== "") {
          body["value"] = d.value;
        }
    if (d.orderid !== undefined && d.orderid !== null && d.orderid !== "") {
          body["orderid"] = d.orderid;
        }
    if (d.isdefault !== undefined && d.isdefault !== null && d.isdefault !== "") {
          body["isdefault"] = d.isdefault;
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
