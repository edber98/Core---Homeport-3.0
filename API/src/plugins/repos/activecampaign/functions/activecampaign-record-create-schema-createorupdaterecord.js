const { utils } = require('./utils');

module.exports = {
  async activecampaign_record_create_schema_createorupdaterecord(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/customObjects/records/{schemaId}";
    const schemaid = String(d.schemaid || '').trim();
    if (!schemaid) return { ok: false, error: 'schemaid requis.' };
    reqPath = reqPath.replace('{schemaid}', encodeURIComponent(schemaid));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.record_id !== undefined && d.record_id !== null && d.record_id !== "") {
          if (!body["record"] || typeof body["record"] !== 'object' || Array.isArray(body["record"])) body["record"] = {};
          body["record"]["id"] = d.record_id;
        }
    if (d.record_externalid !== undefined && d.record_externalid !== null && d.record_externalid !== "") {
          if (!body["record"] || typeof body["record"] !== 'object' || Array.isArray(body["record"])) body["record"] = {};
          body["record"]["externalid"] = d.record_externalid;
        }
    if (d.record_fields !== undefined && d.record_fields !== null && d.record_fields !== "") {
          if (!body["record"] || typeof body["record"] !== 'object' || Array.isArray(body["record"])) body["record"] = {};
          body["record"]["fields"] = d.record_fields;
        }
    if (d.record_relationships !== undefined && d.record_relationships !== null && d.record_relationships !== "") {
          if (!body["record"] || typeof body["record"] !== 'object' || Array.isArray(body["record"])) body["record"] = {};
          body["record"]["relationships"] = d.record_relationships;
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
