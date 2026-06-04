const { utils } = require('./utils');

module.exports = {
  async hotjar_user_lookup_perform(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/organizations/{organization_id}/user-lookup";
    const organization_id = String(d.organization_id || '').trim();
    if (!organization_id) return { ok: false, error: 'organization_id requis.' };
    reqPath = reqPath.replace('{organization_id}', encodeURIComponent(organization_id));

    let query = {};

    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    let headers = {};

    let body;
    try {
      body = {};
      if (d.data_subject_email !== undefined && d.data_subject_email !== null && d.data_subject_email !== '') body.data_subject_email = d.data_subject_email;
      if (d.data_subject_site_id_to_user_id_map !== undefined && d.data_subject_site_id_to_user_id_map !== null && d.data_subject_site_id_to_user_id_map !== '') {
        body.data_subject_site_id_to_user_id_map = utils.parseJsonInput(d.data_subject_site_id_to_user_id_map, 'data_subject_site_id_to_user_id_map', { defaultValue: undefined, allowArray: false });
      }
    } catch (e) { return { ok: false, error: e.message }; }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body, headers });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
