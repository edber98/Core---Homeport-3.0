const { utils } = require('./utils');

module.exports = {
  async close_crm_association_delete_custom_fields_shared_delete_association(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/custom_field/shared/{scf_id}/association/{object_type}/";
    const scf_id = String(d.scf_id || '').trim();
    if (!scf_id) return { ok: false, error: 'scf_id requis.' };
    reqPath = reqPath.replace('{scf_id}', encodeURIComponent(scf_id));
    const object_type = String(d.object_type || '').trim();
    if (!object_type) return { ok: false, error: 'object_type requis.' };
    reqPath = reqPath.replace('{object_type}', encodeURIComponent(object_type));

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
