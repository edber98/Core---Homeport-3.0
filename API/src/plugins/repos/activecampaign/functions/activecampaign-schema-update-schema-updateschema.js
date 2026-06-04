const { utils } = require('./utils');

module.exports = {
  async activecampaign_schema_update_schema_updateschema(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/customObjects/schemas/{schemaId}";
    const schemaid = String(d.schemaid || '').trim();
    if (!schemaid) return { ok: false, error: 'schemaid requis.' };
    reqPath = reqPath.replace('{schemaid}', encodeURIComponent(schemaid));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.schema_slug !== undefined && d.schema_slug !== null && d.schema_slug !== "") {
          if (!body["schema"] || typeof body["schema"] !== 'object' || Array.isArray(body["schema"])) body["schema"] = {};
          body["schema"]["slug"] = d.schema_slug;
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
    if (d.schema_appid !== undefined && d.schema_appid !== null && d.schema_appid !== "") {
          if (!body["schema"] || typeof body["schema"] !== 'object' || Array.isArray(body["schema"])) body["schema"] = {};
          body["schema"]["appid"] = d.schema_appid;
        }
    if (d.schema_fields !== undefined && d.schema_fields !== null && d.schema_fields !== "") {
          if (!body["schema"] || typeof body["schema"] !== 'object' || Array.isArray(body["schema"])) body["schema"] = {};
          body["schema"]["fields"] = d.schema_fields;
        }
    if (d.schema_icons_default !== undefined && d.schema_icons_default !== null && d.schema_icons_default !== "") {
          if (!body["schema"] || typeof body["schema"] !== 'object' || Array.isArray(body["schema"])) body["schema"] = {};
          if (!body["schema"]["icons"] || typeof body["schema"]["icons"] !== 'object' || Array.isArray(body["schema"]["icons"])) body["schema"]["icons"] = {};
          body["schema"]["icons"]["default"] = d.schema_icons_default;
        }
    if (d.schema_relationships_id !== undefined && d.schema_relationships_id !== null && d.schema_relationships_id !== "") {
          if (!body["schema"] || typeof body["schema"] !== 'object' || Array.isArray(body["schema"])) body["schema"] = {};
          if (!body["schema"]["relationships"] || typeof body["schema"]["relationships"] !== 'object' || Array.isArray(body["schema"]["relationships"])) body["schema"]["relationships"] = {};
          body["schema"]["relationships"]["id"] = d.schema_relationships_id;
        }
    if (d.schema_relationships_labels_singular !== undefined && d.schema_relationships_labels_singular !== null && d.schema_relationships_labels_singular !== "") {
          if (!body["schema"] || typeof body["schema"] !== 'object' || Array.isArray(body["schema"])) body["schema"] = {};
          if (!body["schema"]["relationships"] || typeof body["schema"]["relationships"] !== 'object' || Array.isArray(body["schema"]["relationships"])) body["schema"]["relationships"] = {};
          if (!body["schema"]["relationships"]["labels"] || typeof body["schema"]["relationships"]["labels"] !== 'object' || Array.isArray(body["schema"]["relationships"]["labels"])) body["schema"]["relationships"]["labels"] = {};
          body["schema"]["relationships"]["labels"]["singular"] = d.schema_relationships_labels_singular;
        }
    if (d.schema_relationships_labels_plural !== undefined && d.schema_relationships_labels_plural !== null && d.schema_relationships_labels_plural !== "") {
          if (!body["schema"] || typeof body["schema"] !== 'object' || Array.isArray(body["schema"])) body["schema"] = {};
          if (!body["schema"]["relationships"] || typeof body["schema"]["relationships"] !== 'object' || Array.isArray(body["schema"]["relationships"])) body["schema"]["relationships"] = {};
          if (!body["schema"]["relationships"]["labels"] || typeof body["schema"]["relationships"]["labels"] !== 'object' || Array.isArray(body["schema"]["relationships"]["labels"])) body["schema"]["relationships"]["labels"] = {};
          body["schema"]["relationships"]["labels"]["plural"] = d.schema_relationships_labels_plural;
        }
    if (d.schema_relationships_description !== undefined && d.schema_relationships_description !== null && d.schema_relationships_description !== "") {
          if (!body["schema"] || typeof body["schema"] !== 'object' || Array.isArray(body["schema"])) body["schema"] = {};
          if (!body["schema"]["relationships"] || typeof body["schema"]["relationships"] !== 'object' || Array.isArray(body["schema"]["relationships"])) body["schema"]["relationships"] = {};
          body["schema"]["relationships"]["description"] = d.schema_relationships_description;
        }
    if (d.schema_relationships_namespace !== undefined && d.schema_relationships_namespace !== null && d.schema_relationships_namespace !== "") {
          if (!body["schema"] || typeof body["schema"] !== 'object' || Array.isArray(body["schema"])) body["schema"] = {};
          if (!body["schema"]["relationships"] || typeof body["schema"]["relationships"] !== 'object' || Array.isArray(body["schema"]["relationships"])) body["schema"]["relationships"] = {};
          body["schema"]["relationships"]["namespace"] = d.schema_relationships_namespace;
        }
    if (d.schema_relationships_hasmany !== undefined && d.schema_relationships_hasmany !== null && d.schema_relationships_hasmany !== "") {
          if (!body["schema"] || typeof body["schema"] !== 'object' || Array.isArray(body["schema"])) body["schema"] = {};
          if (!body["schema"]["relationships"] || typeof body["schema"]["relationships"] !== 'object' || Array.isArray(body["schema"]["relationships"])) body["schema"]["relationships"] = {};
          body["schema"]["relationships"]["hasmany"] = d.schema_relationships_hasmany;
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
