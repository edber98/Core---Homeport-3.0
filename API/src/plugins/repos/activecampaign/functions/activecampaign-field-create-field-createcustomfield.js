const { utils } = require('./utils');

module.exports = {
  async activecampaign_field_create_field_createcustomfield(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/fields";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.field_title !== undefined && d.field_title !== null && d.field_title !== "") {
          if (!body["field"] || typeof body["field"] !== 'object' || Array.isArray(body["field"])) body["field"] = {};
          body["field"]["title"] = d.field_title;
        }
    if (d.field_type !== undefined && d.field_type !== null && d.field_type !== "") {
          if (!body["field"] || typeof body["field"] !== 'object' || Array.isArray(body["field"])) body["field"] = {};
          body["field"]["type"] = d.field_type;
        }
    if (d.field_descript !== undefined && d.field_descript !== null && d.field_descript !== "") {
          if (!body["field"] || typeof body["field"] !== 'object' || Array.isArray(body["field"])) body["field"] = {};
          body["field"]["descript"] = d.field_descript;
        }
    if (d.field_perstag !== undefined && d.field_perstag !== null && d.field_perstag !== "") {
          if (!body["field"] || typeof body["field"] !== 'object' || Array.isArray(body["field"])) body["field"] = {};
          body["field"]["perstag"] = d.field_perstag;
        }
    if (d.field_defval !== undefined && d.field_defval !== null && d.field_defval !== "") {
          if (!body["field"] || typeof body["field"] !== 'object' || Array.isArray(body["field"])) body["field"] = {};
          body["field"]["defval"] = d.field_defval;
        }
    if (d.field_show_in_list !== undefined && d.field_show_in_list !== null && d.field_show_in_list !== "") {
          if (!body["field"] || typeof body["field"] !== 'object' || Array.isArray(body["field"])) body["field"] = {};
          body["field"]["show_in_list"] = d.field_show_in_list;
        }
    if (d.field_rows !== undefined && d.field_rows !== null && d.field_rows !== "") {
          if (!body["field"] || typeof body["field"] !== 'object' || Array.isArray(body["field"])) body["field"] = {};
          body["field"]["rows"] = d.field_rows;
        }
    if (d.field_cols !== undefined && d.field_cols !== null && d.field_cols !== "") {
          if (!body["field"] || typeof body["field"] !== 'object' || Array.isArray(body["field"])) body["field"] = {};
          body["field"]["cols"] = d.field_cols;
        }
    if (d.field_visible !== undefined && d.field_visible !== null && d.field_visible !== "") {
          if (!body["field"] || typeof body["field"] !== 'object' || Array.isArray(body["field"])) body["field"] = {};
          body["field"]["visible"] = d.field_visible;
        }
    if (d.field_service !== undefined && d.field_service !== null && d.field_service !== "") {
          if (!body["field"] || typeof body["field"] !== 'object' || Array.isArray(body["field"])) body["field"] = {};
          body["field"]["service"] = d.field_service;
        }
    if (d.field_ordernum !== undefined && d.field_ordernum !== null && d.field_ordernum !== "") {
          if (!body["field"] || typeof body["field"] !== 'object' || Array.isArray(body["field"])) body["field"] = {};
          body["field"]["ordernum"] = d.field_ordernum;
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
