const { utils } = require('./utils');

module.exports = {
  async activecampaign_deal_create_deal_newdealcreation(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/deals";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.deal_title !== undefined && d.deal_title !== null && d.deal_title !== "") {
          if (!body["deal"] || typeof body["deal"] !== 'object' || Array.isArray(body["deal"])) body["deal"] = {};
          body["deal"]["title"] = d.deal_title;
        }
    if (d.deal_description !== undefined && d.deal_description !== null && d.deal_description !== "") {
          if (!body["deal"] || typeof body["deal"] !== 'object' || Array.isArray(body["deal"])) body["deal"] = {};
          body["deal"]["description"] = d.deal_description;
        }
    if (d.deal_account !== undefined && d.deal_account !== null && d.deal_account !== "") {
          if (!body["deal"] || typeof body["deal"] !== 'object' || Array.isArray(body["deal"])) body["deal"] = {};
          body["deal"]["account"] = d.deal_account;
        }
    if (d.deal_contact !== undefined && d.deal_contact !== null && d.deal_contact !== "") {
          if (!body["deal"] || typeof body["deal"] !== 'object' || Array.isArray(body["deal"])) body["deal"] = {};
          body["deal"]["contact"] = d.deal_contact;
        }
    if (d.deal_value !== undefined && d.deal_value !== null && d.deal_value !== "") {
          if (!body["deal"] || typeof body["deal"] !== 'object' || Array.isArray(body["deal"])) body["deal"] = {};
          body["deal"]["value"] = d.deal_value;
        }
    if (d.deal_currency !== undefined && d.deal_currency !== null && d.deal_currency !== "") {
          if (!body["deal"] || typeof body["deal"] !== 'object' || Array.isArray(body["deal"])) body["deal"] = {};
          body["deal"]["currency"] = d.deal_currency;
        }
    if (d.deal_group !== undefined && d.deal_group !== null && d.deal_group !== "") {
          if (!body["deal"] || typeof body["deal"] !== 'object' || Array.isArray(body["deal"])) body["deal"] = {};
          body["deal"]["group"] = d.deal_group;
        }
    if (d.deal_stage !== undefined && d.deal_stage !== null && d.deal_stage !== "") {
          if (!body["deal"] || typeof body["deal"] !== 'object' || Array.isArray(body["deal"])) body["deal"] = {};
          body["deal"]["stage"] = d.deal_stage;
        }
    if (d.deal_owner !== undefined && d.deal_owner !== null && d.deal_owner !== "") {
          if (!body["deal"] || typeof body["deal"] !== 'object' || Array.isArray(body["deal"])) body["deal"] = {};
          body["deal"]["owner"] = d.deal_owner;
        }
    if (d.deal_percent !== undefined && d.deal_percent !== null && d.deal_percent !== "") {
          if (!body["deal"] || typeof body["deal"] !== 'object' || Array.isArray(body["deal"])) body["deal"] = {};
          body["deal"]["percent"] = d.deal_percent;
        }
    if (d.deal_status !== undefined && d.deal_status !== null && d.deal_status !== "") {
          if (!body["deal"] || typeof body["deal"] !== 'object' || Array.isArray(body["deal"])) body["deal"] = {};
          body["deal"]["status"] = d.deal_status;
        }
    if (d.deal_fields !== undefined && d.deal_fields !== null && d.deal_fields !== "") {
          if (!body["deal"] || typeof body["deal"] !== 'object' || Array.isArray(body["deal"])) body["deal"] = {};
          body["deal"]["fields"] = d.deal_fields;
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
