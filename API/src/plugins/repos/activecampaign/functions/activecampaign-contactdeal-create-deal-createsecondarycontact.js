const { utils } = require('./utils');

module.exports = {
  async activecampaign_contactdeal_create_deal_createsecondarycontact(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/contactDeals";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.contactdeal_deal !== undefined && d.contactdeal_deal !== null && d.contactdeal_deal !== "") {
          if (!body["contactdeal"] || typeof body["contactdeal"] !== 'object' || Array.isArray(body["contactdeal"])) body["contactdeal"] = {};
          body["contactdeal"]["deal"] = d.contactdeal_deal;
        }
    if (d.contactdeal_contact !== undefined && d.contactdeal_contact !== null && d.contactdeal_contact !== "") {
          if (!body["contactdeal"] || typeof body["contactdeal"] !== 'object' || Array.isArray(body["contactdeal"])) body["contactdeal"] = {};
          body["contactdeal"]["contact"] = d.contactdeal_contact;
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
