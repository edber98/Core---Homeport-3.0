const { utils } = require('./utils');

module.exports = {
  async activecampaign_contactautomation_create_contact_addtoautomation(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/contactAutomations";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.contactautomation_contact !== undefined && d.contactautomation_contact !== null && d.contactautomation_contact !== "") {
          if (!body["contactautomation"] || typeof body["contactautomation"] !== 'object' || Array.isArray(body["contactautomation"])) body["contactautomation"] = {};
          body["contactautomation"]["contact"] = d.contactautomation_contact;
        }
    if (d.contactautomation_automation !== undefined && d.contactautomation_automation !== null && d.contactautomation_automation !== "") {
          if (!body["contactautomation"] || typeof body["contactautomation"] !== 'object' || Array.isArray(body["contactautomation"])) body["contactautomation"] = {};
          body["contactautomation"]["automation"] = d.contactautomation_automation;
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
