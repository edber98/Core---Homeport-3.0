const { utils } = require('./utils');

module.exports = {
  async hotjar_auth_token(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/oauth/token";
    

    let query = {};

    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    let headers = {};

    const body = {};
    if (d.grant_type !== undefined && d.grant_type !== null && d.grant_type !== '') body.grant_type = d.grant_type;
    if (d.client_id !== undefined && d.client_id !== null && d.client_id !== '') body.client_id = d.client_id;
    if (d.client_secret !== undefined && d.client_secret !== null && d.client_secret !== '') body.client_secret = d.client_secret;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body, headers });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
