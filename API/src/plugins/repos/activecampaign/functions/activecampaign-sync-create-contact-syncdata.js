const { utils } = require('./utils');

module.exports = {
  async activecampaign_sync_create_contact_syncdata(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/contact/sync";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.contact_email !== undefined && d.contact_email !== null && d.contact_email !== "") {
          if (!body["contact"] || typeof body["contact"] !== 'object' || Array.isArray(body["contact"])) body["contact"] = {};
          body["contact"]["email"] = d.contact_email;
        }
    if (d.contact_firstname !== undefined && d.contact_firstname !== null && d.contact_firstname !== "") {
          if (!body["contact"] || typeof body["contact"] !== 'object' || Array.isArray(body["contact"])) body["contact"] = {};
          body["contact"]["firstname"] = d.contact_firstname;
        }
    if (d.contact_lastname !== undefined && d.contact_lastname !== null && d.contact_lastname !== "") {
          if (!body["contact"] || typeof body["contact"] !== 'object' || Array.isArray(body["contact"])) body["contact"] = {};
          body["contact"]["lastname"] = d.contact_lastname;
        }
    if (d.contact_phone !== undefined && d.contact_phone !== null && d.contact_phone !== "") {
          if (!body["contact"] || typeof body["contact"] !== 'object' || Array.isArray(body["contact"])) body["contact"] = {};
          body["contact"]["phone"] = d.contact_phone;
        }
    if (d.contact_fieldvalues !== undefined && d.contact_fieldvalues !== null && d.contact_fieldvalues !== "") {
          if (!body["contact"] || typeof body["contact"] !== 'object' || Array.isArray(body["contact"])) body["contact"] = {};
          body["contact"]["fieldvalues"] = d.contact_fieldvalues;
        }
    if (d.contact_orgid !== undefined && d.contact_orgid !== null && d.contact_orgid !== "") {
          if (!body["contact"] || typeof body["contact"] !== 'object' || Array.isArray(body["contact"])) body["contact"] = {};
          body["contact"]["orgid"] = d.contact_orgid;
        }
    if (d.contact_deleted !== undefined && d.contact_deleted !== null && d.contact_deleted !== "") {
          if (!body["contact"] || typeof body["contact"] !== 'object' || Array.isArray(body["contact"])) body["contact"] = {};
          body["contact"]["deleted"] = d.contact_deleted;
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
