const { utils } = require('./utils');

module.exports = {
  async activecampaign_bulkcreate_create_field_bulkcreatecustomaccountfieldvalue(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/accountCustomFieldData/bulkCreate";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.array_customeraccountid !== undefined && d.array_customeraccountid !== null && d.array_customeraccountid !== "") {
          if (!body["array"] || typeof body["array"] !== 'object' || Array.isArray(body["array"])) body["array"] = {};
          body["array"]["customeraccountid"] = d.array_customeraccountid;
        }
    if (d.array_customfieldid !== undefined && d.array_customfieldid !== null && d.array_customfieldid !== "") {
          if (!body["array"] || typeof body["array"] !== 'object' || Array.isArray(body["array"])) body["array"] = {};
          body["array"]["customfieldid"] = d.array_customfieldid;
        }
    if (d.array_fieldvalue !== undefined && d.array_fieldvalue !== null && d.array_fieldvalue !== "") {
          if (!body["array"] || typeof body["array"] !== 'object' || Array.isArray(body["array"])) body["array"] = {};
          body["array"]["fieldvalue"] = d.array_fieldvalue;
        }
    if (d.array_fieldcurrency !== undefined && d.array_fieldcurrency !== null && d.array_fieldcurrency !== "") {
          if (!body["array"] || typeof body["array"] !== 'object' || Array.isArray(body["array"])) body["array"] = {};
          body["array"]["fieldcurrency"] = d.array_fieldcurrency;
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
