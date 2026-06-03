const { utils } = require('./utils');

module.exports = {
  async activecampaign_fieldvalue_create_field_createcustomvalue(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/fieldValues";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.fieldvalue_contact !== undefined && d.fieldvalue_contact !== null && d.fieldvalue_contact !== "") {
          if (!body["fieldvalue"] || typeof body["fieldvalue"] !== 'object' || Array.isArray(body["fieldvalue"])) body["fieldvalue"] = {};
          body["fieldvalue"]["contact"] = d.fieldvalue_contact;
        }
    if (d.fieldvalue_field !== undefined && d.fieldvalue_field !== null && d.fieldvalue_field !== "") {
          if (!body["fieldvalue"] || typeof body["fieldvalue"] !== 'object' || Array.isArray(body["fieldvalue"])) body["fieldvalue"] = {};
          body["fieldvalue"]["field"] = d.fieldvalue_field;
        }
    if (d.fieldvalue_value !== undefined && d.fieldvalue_value !== null && d.fieldvalue_value !== "") {
          if (!body["fieldvalue"] || typeof body["fieldvalue"] !== 'object' || Array.isArray(body["fieldvalue"])) body["fieldvalue"] = {};
          body["fieldvalue"]["value"] = d.fieldvalue_value;
        }
    if (d.usedefaults !== undefined && d.usedefaults !== null && d.usedefaults !== "") {
          body["usedefaults"] = d.usedefaults;
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
