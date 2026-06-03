const { utils } = require('./utils');

module.exports = {
  async activecampaign_record_get_schema_getbyid(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/customObjects/records/{schemaId}/{recordId}";
    const schemaid = String(d.schemaid || '').trim();
    if (!schemaid) return { ok: false, error: 'schemaid requis.' };
    reqPath = reqPath.replace('{schemaid}', encodeURIComponent(schemaid));
    const recordid = String(d.recordid || '').trim();
    if (!recordid) return { ok: false, error: 'recordid requis.' };
    reqPath = reqPath.replace('{recordid}', encodeURIComponent(recordid));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'GET', query, body });
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
