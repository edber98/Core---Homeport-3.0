const { utils } = require('./utils');

module.exports = {
  async activecampaign_connection_create_connection_createnewresource(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/connections";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.connection_service !== undefined && d.connection_service !== null && d.connection_service !== "") {
          if (!body["connection"] || typeof body["connection"] !== 'object' || Array.isArray(body["connection"])) body["connection"] = {};
          body["connection"]["service"] = d.connection_service;
        }
    if (d.connection_externalid !== undefined && d.connection_externalid !== null && d.connection_externalid !== "") {
          if (!body["connection"] || typeof body["connection"] !== 'object' || Array.isArray(body["connection"])) body["connection"] = {};
          body["connection"]["externalid"] = d.connection_externalid;
        }
    if (d.connection_name !== undefined && d.connection_name !== null && d.connection_name !== "") {
          if (!body["connection"] || typeof body["connection"] !== 'object' || Array.isArray(body["connection"])) body["connection"] = {};
          body["connection"]["name"] = d.connection_name;
        }
    if (d.connection_logourl !== undefined && d.connection_logourl !== null && d.connection_logourl !== "") {
          if (!body["connection"] || typeof body["connection"] !== 'object' || Array.isArray(body["connection"])) body["connection"] = {};
          body["connection"]["logourl"] = d.connection_logourl;
        }
    if (d.connection_linkurl !== undefined && d.connection_linkurl !== null && d.connection_linkurl !== "") {
          if (!body["connection"] || typeof body["connection"] !== 'object' || Array.isArray(body["connection"])) body["connection"] = {};
          body["connection"]["linkurl"] = d.connection_linkurl;
        }
    if (d.connection_listid !== undefined && d.connection_listid !== null && d.connection_listid !== "") {
          if (!body["connection"] || typeof body["connection"] !== 'object' || Array.isArray(body["connection"])) body["connection"] = {};
          body["connection"]["listid"] = d.connection_listid;
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
