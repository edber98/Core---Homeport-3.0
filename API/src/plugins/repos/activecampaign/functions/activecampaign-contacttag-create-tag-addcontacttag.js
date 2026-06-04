const { utils } = require('./utils');

module.exports = {
  async activecampaign_contacttag_create_tag_addcontacttag(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/contactTags";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.contacttag_contact !== undefined && d.contacttag_contact !== null && d.contacttag_contact !== "") {
          if (!body["contacttag"] || typeof body["contacttag"] !== 'object' || Array.isArray(body["contacttag"])) body["contacttag"] = {};
          body["contacttag"]["contact"] = d.contacttag_contact;
        }
    if (d.contacttag_tag !== undefined && d.contacttag_tag !== null && d.contacttag_tag !== "") {
          if (!body["contacttag"] || typeof body["contacttag"] !== 'object' || Array.isArray(body["contacttag"])) body["contacttag"] = {};
          body["contacttag"]["tag"] = d.contacttag_tag;
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
