const { utils } = require('./utils');

module.exports = {
  async activecampaign_external_delete_schema_deleterecordbyexternalid(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/customObjects/records/{schemaId}/external/{externalId}";
    const schemaid = String(d.schemaid || '').trim();
    if (!schemaid) return { ok: false, error: 'schemaid requis.' };
    reqPath = reqPath.replace('{schemaid}', encodeURIComponent(schemaid));
    const externalid = String(d.externalid || '').trim();
    if (!externalid) return { ok: false, error: 'externalid requis.' };
    reqPath = reqPath.replace('{externalid}', encodeURIComponent(externalid));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'DELETE', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
