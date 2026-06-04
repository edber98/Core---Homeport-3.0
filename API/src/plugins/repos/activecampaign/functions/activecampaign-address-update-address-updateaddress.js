const { utils } = require('./utils');

module.exports = {
  async activecampaign_address_update_address_updateaddress(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/addresses/{id}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.address_groupid !== undefined && d.address_groupid !== null && d.address_groupid !== "") {
          if (!body["address"] || typeof body["address"] !== 'object' || Array.isArray(body["address"])) body["address"] = {};
          body["address"]["groupid"] = d.address_groupid;
        }
    if (d.address_global !== undefined && d.address_global !== null && d.address_global !== "") {
          if (!body["address"] || typeof body["address"] !== 'object' || Array.isArray(body["address"])) body["address"] = {};
          body["address"]["global"] = d.address_global;
        }
    if (d.address_company_name !== undefined && d.address_company_name !== null && d.address_company_name !== "") {
          if (!body["address"] || typeof body["address"] !== 'object' || Array.isArray(body["address"])) body["address"] = {};
          body["address"]["company_name"] = d.address_company_name;
        }
    if (d.address_address_1 !== undefined && d.address_address_1 !== null && d.address_address_1 !== "") {
          if (!body["address"] || typeof body["address"] !== 'object' || Array.isArray(body["address"])) body["address"] = {};
          body["address"]["address_1"] = d.address_address_1;
        }
    if (d.address_address_2 !== undefined && d.address_address_2 !== null && d.address_address_2 !== "") {
          if (!body["address"] || typeof body["address"] !== 'object' || Array.isArray(body["address"])) body["address"] = {};
          body["address"]["address_2"] = d.address_address_2;
        }
    if (d.address_city !== undefined && d.address_city !== null && d.address_city !== "") {
          if (!body["address"] || typeof body["address"] !== 'object' || Array.isArray(body["address"])) body["address"] = {};
          body["address"]["city"] = d.address_city;
        }
    if (d.address_state !== undefined && d.address_state !== null && d.address_state !== "") {
          if (!body["address"] || typeof body["address"] !== 'object' || Array.isArray(body["address"])) body["address"] = {};
          body["address"]["state"] = d.address_state;
        }
    if (d.address_zip !== undefined && d.address_zip !== null && d.address_zip !== "") {
          if (!body["address"] || typeof body["address"] !== 'object' || Array.isArray(body["address"])) body["address"] = {};
          body["address"]["zip"] = d.address_zip;
        }
    if (d.address_district !== undefined && d.address_district !== null && d.address_district !== "") {
          if (!body["address"] || typeof body["address"] !== 'object' || Array.isArray(body["address"])) body["address"] = {};
          body["address"]["district"] = d.address_district;
        }
    if (d.address_country !== undefined && d.address_country !== null && d.address_country !== "") {
          if (!body["address"] || typeof body["address"] !== 'object' || Array.isArray(body["address"])) body["address"] = {};
          body["address"]["country"] = d.address_country;
        }
    if (d.address_allgroup !== undefined && d.address_allgroup !== null && d.address_allgroup !== "") {
          if (!body["address"] || typeof body["address"] !== 'object' || Array.isArray(body["address"])) body["address"] = {};
          body["address"]["allgroup"] = d.address_allgroup;
        }
    if (d.address_is_default !== undefined && d.address_is_default !== null && d.address_is_default !== "") {
          if (!body["address"] || typeof body["address"] !== 'object' || Array.isArray(body["address"])) body["address"] = {};
          body["address"]["is_default"] = d.address_is_default;
        }
    const requestBody = Object.keys(body).length ? body : undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body: requestBody });
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
