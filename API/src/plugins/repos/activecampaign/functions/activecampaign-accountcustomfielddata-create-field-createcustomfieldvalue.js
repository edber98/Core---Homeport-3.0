const { utils } = require('./utils');

module.exports = {
  async activecampaign_accountcustomfielddata_create_field_createcustomfieldvalue(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/accountCustomFieldData";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.accountcustomfielddatum_customeraccountid !== undefined && d.accountcustomfielddatum_customeraccountid !== null && d.accountcustomfielddatum_customeraccountid !== "") {
          if (!body["accountcustomfielddatum"] || typeof body["accountcustomfielddatum"] !== 'object' || Array.isArray(body["accountcustomfielddatum"])) body["accountcustomfielddatum"] = {};
          body["accountcustomfielddatum"]["customeraccountid"] = d.accountcustomfielddatum_customeraccountid;
        }
    if (d.accountcustomfielddatum_customfieldid !== undefined && d.accountcustomfielddatum_customfieldid !== null && d.accountcustomfielddatum_customfieldid !== "") {
          if (!body["accountcustomfielddatum"] || typeof body["accountcustomfielddatum"] !== 'object' || Array.isArray(body["accountcustomfielddatum"])) body["accountcustomfielddatum"] = {};
          body["accountcustomfielddatum"]["customfieldid"] = d.accountcustomfielddatum_customfieldid;
        }
    if (d.accountcustomfielddatum_fieldvalue !== undefined && d.accountcustomfielddatum_fieldvalue !== null && d.accountcustomfielddatum_fieldvalue !== "") {
          if (!body["accountcustomfielddatum"] || typeof body["accountcustomfielddatum"] !== 'object' || Array.isArray(body["accountcustomfielddatum"])) body["accountcustomfielddatum"] = {};
          body["accountcustomfielddatum"]["fieldvalue"] = d.accountcustomfielddatum_fieldvalue;
        }
    if (d.accountcustomfielddatum_fieldcurrency !== undefined && d.accountcustomfielddatum_fieldcurrency !== null && d.accountcustomfielddatum_fieldcurrency !== "") {
          if (!body["accountcustomfielddatum"] || typeof body["accountcustomfielddatum"] !== 'object' || Array.isArray(body["accountcustomfielddatum"])) body["accountcustomfielddatum"] = {};
          body["accountcustomfielddatum"]["fieldcurrency"] = d.accountcustomfielddatum_fieldcurrency;
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
