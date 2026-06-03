const { utils } = require('./utils');

module.exports = {
  async activecampaign_account_create_account_createnewaccount(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/accounts";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.account_name !== undefined && d.account_name !== null && d.account_name !== "") {
          if (!body["account"] || typeof body["account"] !== 'object' || Array.isArray(body["account"])) body["account"] = {};
          body["account"]["name"] = d.account_name;
        }
    if (d.account_accounturl !== undefined && d.account_accounturl !== null && d.account_accounturl !== "") {
          if (!body["account"] || typeof body["account"] !== 'object' || Array.isArray(body["account"])) body["account"] = {};
          body["account"]["accounturl"] = d.account_accounturl;
        }
    if (d.account_owner !== undefined && d.account_owner !== null && d.account_owner !== "") {
          if (!body["account"] || typeof body["account"] !== 'object' || Array.isArray(body["account"])) body["account"] = {};
          body["account"]["owner"] = d.account_owner;
        }
    if (d.account_fields !== undefined && d.account_fields !== null && d.account_fields !== "") {
          if (!body["account"] || typeof body["account"] !== 'object' || Array.isArray(body["account"])) body["account"] = {};
          body["account"]["fields"] = d.account_fields;
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
