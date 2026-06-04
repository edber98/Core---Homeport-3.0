const { utils } = require('./utils');

module.exports = {
  async activecampaign_dealstage_create_deal_createstage(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/dealStages";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.dealstage_title !== undefined && d.dealstage_title !== null && d.dealstage_title !== "") {
          if (!body["dealstage"] || typeof body["dealstage"] !== 'object' || Array.isArray(body["dealstage"])) body["dealstage"] = {};
          body["dealstage"]["title"] = d.dealstage_title;
        }
    if (d.dealstage_group !== undefined && d.dealstage_group !== null && d.dealstage_group !== "") {
          if (!body["dealstage"] || typeof body["dealstage"] !== 'object' || Array.isArray(body["dealstage"])) body["dealstage"] = {};
          body["dealstage"]["group"] = d.dealstage_group;
        }
    if (d.dealstage_order !== undefined && d.dealstage_order !== null && d.dealstage_order !== "") {
          if (!body["dealstage"] || typeof body["dealstage"] !== 'object' || Array.isArray(body["dealstage"])) body["dealstage"] = {};
          body["dealstage"]["order"] = d.dealstage_order;
        }
    if (d.dealstage_dealorder !== undefined && d.dealstage_dealorder !== null && d.dealstage_dealorder !== "") {
          if (!body["dealstage"] || typeof body["dealstage"] !== 'object' || Array.isArray(body["dealstage"])) body["dealstage"] = {};
          body["dealstage"]["dealorder"] = d.dealstage_dealorder;
        }
    if (d.dealstage_cardregion1 !== undefined && d.dealstage_cardregion1 !== null && d.dealstage_cardregion1 !== "") {
          if (!body["dealstage"] || typeof body["dealstage"] !== 'object' || Array.isArray(body["dealstage"])) body["dealstage"] = {};
          body["dealstage"]["cardregion1"] = d.dealstage_cardregion1;
        }
    if (d.dealstage_cardregion2 !== undefined && d.dealstage_cardregion2 !== null && d.dealstage_cardregion2 !== "") {
          if (!body["dealstage"] || typeof body["dealstage"] !== 'object' || Array.isArray(body["dealstage"])) body["dealstage"] = {};
          body["dealstage"]["cardregion2"] = d.dealstage_cardregion2;
        }
    if (d.dealstage_cardregion3 !== undefined && d.dealstage_cardregion3 !== null && d.dealstage_cardregion3 !== "") {
          if (!body["dealstage"] || typeof body["dealstage"] !== 'object' || Array.isArray(body["dealstage"])) body["dealstage"] = {};
          body["dealstage"]["cardregion3"] = d.dealstage_cardregion3;
        }
    if (d.dealstage_cardregion4 !== undefined && d.dealstage_cardregion4 !== null && d.dealstage_cardregion4 !== "") {
          if (!body["dealstage"] || typeof body["dealstage"] !== 'object' || Array.isArray(body["dealstage"])) body["dealstage"] = {};
          body["dealstage"]["cardregion4"] = d.dealstage_cardregion4;
        }
    if (d.dealstage_cardregion5 !== undefined && d.dealstage_cardregion5 !== null && d.dealstage_cardregion5 !== "") {
          if (!body["dealstage"] || typeof body["dealstage"] !== 'object' || Array.isArray(body["dealstage"])) body["dealstage"] = {};
          body["dealstage"]["cardregion5"] = d.dealstage_cardregion5;
        }
    if (d.dealstage_color !== undefined && d.dealstage_color !== null && d.dealstage_color !== "") {
          if (!body["dealstage"] || typeof body["dealstage"] !== 'object' || Array.isArray(body["dealstage"])) body["dealstage"] = {};
          body["dealstage"]["color"] = d.dealstage_color;
        }
    if (d.dealstage_width !== undefined && d.dealstage_width !== null && d.dealstage_width !== "") {
          if (!body["dealstage"] || typeof body["dealstage"] !== 'object' || Array.isArray(body["dealstage"])) body["dealstage"] = {};
          body["dealstage"]["width"] = d.dealstage_width;
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
