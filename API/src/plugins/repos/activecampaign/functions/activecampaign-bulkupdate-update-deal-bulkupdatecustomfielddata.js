const { utils } = require('./utils');

module.exports = {
  async activecampaign_bulkupdate_update_deal_bulkupdatecustomfielddata(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/dealCustomFieldData/bulkUpdate";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.array_id !== undefined && d.array_id !== null && d.array_id !== "") {
          if (!body["array"] || typeof body["array"] !== 'object' || Array.isArray(body["array"])) body["array"] = {};
          body["array"]["id"] = d.array_id;
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
    const res = await utils.providerRequest(opts, reqPath, { method: 'PATCH', query, body: requestBody });
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
