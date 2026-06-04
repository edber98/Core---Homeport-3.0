const { utils } = require('./utils');

module.exports = {
  async close_crm_association_create_custom_fields_shared_create_association(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/custom_field/shared/{scf_id}/association/";
    const scf_id = String(d.scf_id || '').trim();
    if (!scf_id) return { ok: false, error: 'scf_id requis.' };
    reqPath = reqPath.replace('{scf_id}', encodeURIComponent(scf_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const bodyResult = utils.buildRequestBody(d, [{"key":"editable_with_roles","target":"editable_with_roles","type":"array"},{"key":"object_type","target":"object_type","type":"string"},{"key":"required","target":"required","type":"boolean"}]);
    if (!bodyResult.ok) return bodyResult;
    const body = bodyResult.body;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
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
