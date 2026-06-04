const { utils } = require('./utils');

module.exports = {
  async activecampaign_bulk_import_create_contact_bulkimportcontacts(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/import/bulk_import";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.contacts !== undefined && d.contacts !== null && d.contacts !== "") {
          body["contacts"] = d.contacts;
        }
    if (d.callback_url !== undefined && d.callback_url !== null && d.callback_url !== "") {
          if (!body["callback"] || typeof body["callback"] !== 'object' || Array.isArray(body["callback"])) body["callback"] = {};
          body["callback"]["url"] = d.callback_url;
        }
    if (d.callback_requesttype !== undefined && d.callback_requesttype !== null && d.callback_requesttype !== "") {
          if (!body["callback"] || typeof body["callback"] !== 'object' || Array.isArray(body["callback"])) body["callback"] = {};
          body["callback"]["requesttype"] = d.callback_requesttype;
        }
    if (d.callback_detailed_results !== undefined && d.callback_detailed_results !== null && d.callback_detailed_results !== "") {
          if (!body["callback"] || typeof body["callback"] !== 'object' || Array.isArray(body["callback"])) body["callback"] = {};
          body["callback"]["detailed_results"] = d.callback_detailed_results;
        }
    if (d.callback_params !== undefined && d.callback_params !== null && d.callback_params !== "") {
          if (!body["callback"] || typeof body["callback"] !== 'object' || Array.isArray(body["callback"])) body["callback"] = {};
          body["callback"]["params"] = d.callback_params;
        }
    if (d.callback_headers !== undefined && d.callback_headers !== null && d.callback_headers !== "") {
          if (!body["callback"] || typeof body["callback"] !== 'object' || Array.isArray(body["callback"])) body["callback"] = {};
          body["callback"]["headers"] = d.callback_headers;
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
