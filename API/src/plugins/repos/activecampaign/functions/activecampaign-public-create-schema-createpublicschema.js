const { utils } = require('./utils');

module.exports = {
  async activecampaign_public_create_schema_createpublicschema(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/customObjects/schemas/public";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.schema_slug !== undefined && d.schema_slug !== null && d.schema_slug !== "") {
          if (!body["schema"] || typeof body["schema"] !== 'object' || Array.isArray(body["schema"])) body["schema"] = {};
          body["schema"]["slug"] = d.schema_slug;
        }
    if (d.schema_appid !== undefined && d.schema_appid !== null && d.schema_appid !== "") {
          if (!body["schema"] || typeof body["schema"] !== 'object' || Array.isArray(body["schema"])) body["schema"] = {};
          body["schema"]["appid"] = d.schema_appid;
        }
    if (d.schema_labels_singular !== undefined && d.schema_labels_singular !== null && d.schema_labels_singular !== "") {
          if (!body["schema"] || typeof body["schema"] !== 'object' || Array.isArray(body["schema"])) body["schema"] = {};
          if (!body["schema"]["labels"] || typeof body["schema"]["labels"] !== 'object' || Array.isArray(body["schema"]["labels"])) body["schema"]["labels"] = {};
          body["schema"]["labels"]["singular"] = d.schema_labels_singular;
        }
    if (d.schema_labels_plural !== undefined && d.schema_labels_plural !== null && d.schema_labels_plural !== "") {
          if (!body["schema"] || typeof body["schema"] !== 'object' || Array.isArray(body["schema"])) body["schema"] = {};
          if (!body["schema"]["labels"] || typeof body["schema"]["labels"] !== 'object' || Array.isArray(body["schema"]["labels"])) body["schema"]["labels"] = {};
          body["schema"]["labels"]["plural"] = d.schema_labels_plural;
        }
    if (d.schema_description !== undefined && d.schema_description !== null && d.schema_description !== "") {
          if (!body["schema"] || typeof body["schema"] !== 'object' || Array.isArray(body["schema"])) body["schema"] = {};
          body["schema"]["description"] = d.schema_description;
        }
    if (d.schema_fields !== undefined && d.schema_fields !== null && d.schema_fields !== "") {
          if (!body["schema"] || typeof body["schema"] !== 'object' || Array.isArray(body["schema"])) body["schema"] = {};
          body["schema"]["fields"] = d.schema_fields;
        }
    if (d.schema_relationships !== undefined && d.schema_relationships !== null && d.schema_relationships !== "") {
          if (!body["schema"] || typeof body["schema"] !== 'object' || Array.isArray(body["schema"])) body["schema"] = {};
          body["schema"]["relationships"] = d.schema_relationships;
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
