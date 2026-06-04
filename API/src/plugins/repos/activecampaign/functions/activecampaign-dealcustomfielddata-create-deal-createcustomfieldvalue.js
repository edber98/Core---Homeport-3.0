const { utils } = require('./utils');

module.exports = {
  async activecampaign_dealcustomfielddata_create_deal_createcustomfieldvalue(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/dealCustomFieldData";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.dealcustomfielddatum_dealid !== undefined && d.dealcustomfielddatum_dealid !== null && d.dealcustomfielddatum_dealid !== "") {
          if (!body["dealcustomfielddatum"] || typeof body["dealcustomfielddatum"] !== 'object' || Array.isArray(body["dealcustomfielddatum"])) body["dealcustomfielddatum"] = {};
          body["dealcustomfielddatum"]["dealid"] = d.dealcustomfielddatum_dealid;
        }
    if (d.dealcustomfielddatum_customfieldid !== undefined && d.dealcustomfielddatum_customfieldid !== null && d.dealcustomfielddatum_customfieldid !== "") {
          if (!body["dealcustomfielddatum"] || typeof body["dealcustomfielddatum"] !== 'object' || Array.isArray(body["dealcustomfielddatum"])) body["dealcustomfielddatum"] = {};
          body["dealcustomfielddatum"]["customfieldid"] = d.dealcustomfielddatum_customfieldid;
        }
    if (d.dealcustomfielddatum_fieldvalue !== undefined && d.dealcustomfielddatum_fieldvalue !== null && d.dealcustomfielddatum_fieldvalue !== "") {
          if (!body["dealcustomfielddatum"] || typeof body["dealcustomfielddatum"] !== 'object' || Array.isArray(body["dealcustomfielddatum"])) body["dealcustomfielddatum"] = {};
          body["dealcustomfielddatum"]["fieldvalue"] = d.dealcustomfielddatum_fieldvalue;
        }
    if (d.dealcustomfielddatum_fieldcurrency !== undefined && d.dealcustomfielddatum_fieldcurrency !== null && d.dealcustomfielddatum_fieldcurrency !== "") {
          if (!body["dealcustomfielddatum"] || typeof body["dealcustomfielddatum"] !== 'object' || Array.isArray(body["dealcustomfielddatum"])) body["dealcustomfielddatum"] = {};
          body["dealcustomfielddatum"]["fieldcurrency"] = d.dealcustomfielddatum_fieldcurrency;
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
