const { utils } = require('./utils');

module.exports = {
  async activecampaign_savedrespons_create_response_createsavedresponse(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/savedResponses";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.savedresponse_title !== undefined && d.savedresponse_title !== null && d.savedresponse_title !== "") {
          if (!body["savedresponse"] || typeof body["savedresponse"] !== 'object' || Array.isArray(body["savedresponse"])) body["savedresponse"] = {};
          body["savedresponse"]["title"] = d.savedresponse_title;
        }
    if (d.savedresponse_subject !== undefined && d.savedresponse_subject !== null && d.savedresponse_subject !== "") {
          if (!body["savedresponse"] || typeof body["savedresponse"] !== 'object' || Array.isArray(body["savedresponse"])) body["savedresponse"] = {};
          body["savedresponse"]["subject"] = d.savedresponse_subject;
        }
    if (d.savedresponse_body !== undefined && d.savedresponse_body !== null && d.savedresponse_body !== "") {
          if (!body["savedresponse"] || typeof body["savedresponse"] !== 'object' || Array.isArray(body["savedresponse"])) body["savedresponse"] = {};
          body["savedresponse"]["body"] = d.savedresponse_body;
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
