const { utils } = require('./utils');

module.exports = {
  async activecampaign_contactlist_create_list_updateliststatusforcontact(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/contactLists";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.contactlist_list !== undefined && d.contactlist_list !== null && d.contactlist_list !== "") {
          if (!body["contactlist"] || typeof body["contactlist"] !== 'object' || Array.isArray(body["contactlist"])) body["contactlist"] = {};
          body["contactlist"]["list"] = d.contactlist_list;
        }
    if (d.contactlist_contact !== undefined && d.contactlist_contact !== null && d.contactlist_contact !== "") {
          if (!body["contactlist"] || typeof body["contactlist"] !== 'object' || Array.isArray(body["contactlist"])) body["contactlist"] = {};
          body["contactlist"]["contact"] = d.contactlist_contact;
        }
    if (d.contactlist_status !== undefined && d.contactlist_status !== null && d.contactlist_status !== "") {
          if (!body["contactlist"] || typeof body["contactlist"] !== 'object' || Array.isArray(body["contactlist"])) body["contactlist"] = {};
          body["contactlist"]["status"] = d.contactlist_status;
        }
    if (d.contactlist_sourceid !== undefined && d.contactlist_sourceid !== null && d.contactlist_sourceid !== "") {
          if (!body["contactlist"] || typeof body["contactlist"] !== 'object' || Array.isArray(body["contactlist"])) body["contactlist"] = {};
          body["contactlist"]["sourceid"] = d.contactlist_sourceid;
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
