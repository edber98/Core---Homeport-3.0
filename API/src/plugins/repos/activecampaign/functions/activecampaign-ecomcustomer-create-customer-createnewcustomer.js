const { utils } = require('./utils');

module.exports = {
  async activecampaign_ecomcustomer_create_customer_createnewcustomer(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/ecomCustomers";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.ecomcustomer_connectionid !== undefined && d.ecomcustomer_connectionid !== null && d.ecomcustomer_connectionid !== "") {
          if (!body["ecomcustomer"] || typeof body["ecomcustomer"] !== 'object' || Array.isArray(body["ecomcustomer"])) body["ecomcustomer"] = {};
          body["ecomcustomer"]["connectionid"] = d.ecomcustomer_connectionid;
        }
    if (d.ecomcustomer_externalid !== undefined && d.ecomcustomer_externalid !== null && d.ecomcustomer_externalid !== "") {
          if (!body["ecomcustomer"] || typeof body["ecomcustomer"] !== 'object' || Array.isArray(body["ecomcustomer"])) body["ecomcustomer"] = {};
          body["ecomcustomer"]["externalid"] = d.ecomcustomer_externalid;
        }
    if (d.ecomcustomer_email !== undefined && d.ecomcustomer_email !== null && d.ecomcustomer_email !== "") {
          if (!body["ecomcustomer"] || typeof body["ecomcustomer"] !== 'object' || Array.isArray(body["ecomcustomer"])) body["ecomcustomer"] = {};
          body["ecomcustomer"]["email"] = d.ecomcustomer_email;
        }
    if (d.ecomcustomer_acceptsmarketing !== undefined && d.ecomcustomer_acceptsmarketing !== null && d.ecomcustomer_acceptsmarketing !== "") {
          if (!body["ecomcustomer"] || typeof body["ecomcustomer"] !== 'object' || Array.isArray(body["ecomcustomer"])) body["ecomcustomer"] = {};
          body["ecomcustomer"]["acceptsmarketing"] = d.ecomcustomer_acceptsmarketing;
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
