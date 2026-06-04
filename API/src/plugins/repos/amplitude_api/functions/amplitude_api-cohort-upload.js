const { utils } = require('./utils');

module.exports = {
  async amplitude_api_cohort_upload(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/3/cohorts/upload";
    

    let query = {};
    try { query = utils.parseJsonInput(d.query, 'query', { defaultValue: {}, allowArray: false }) || {}; }
    catch (e) { return { ok: false, error: e.message }; }

    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    let headers = {};
    try { headers = utils.parseJsonInput(d.headers, 'headers', { defaultValue: {}, allowArray: false }) || {}; }
    catch (e) { return { ok: false, error: e.message }; }

    let ids;
    try { ids = utils.parseJsonInput(d.ids, 'ids', { defaultValue: undefined, allowArray: true, allowObject: false }); }
    catch (e) { return { ok: false, error: e.message }; }
    if (!Array.isArray(ids) || !ids.length) return { ok: false, error: 'ids requis et doit être un tableau JSON non vide.' };
    const body = {};
    if (d.name !== undefined && d.name !== null && d.name !== '') body.name = d.name;
    if (d.app_id !== undefined && d.app_id !== null && d.app_id !== '') body.app_id = Number(d.app_id);
    if (d.id_type !== undefined && d.id_type !== null && d.id_type !== '') body.id_type = d.id_type;
    if (d.cg !== undefined && d.cg !== null && d.cg !== '') body.cg = d.cg;
    body.ids = ids;
    if (d.owner !== undefined && d.owner !== null && d.owner !== '') body.owner = d.owner;
    if (d.published !== undefined && d.published !== null && d.published !== '') body.published = Boolean(d.published);
    if (d.skip_save !== undefined && d.skip_save !== null && d.skip_save !== '') body.skip_save = Boolean(d.skip_save);
    if (d.skip_invalid_ids !== undefined && d.skip_invalid_ids !== null && d.skip_invalid_ids !== '') body.skip_invalid_ids = Boolean(d.skip_invalid_ids);
    if (d.existing_cohort_id !== undefined && d.existing_cohort_id !== null && d.existing_cohort_id !== '') body.existing_cohort_id = d.existing_cohort_id;
    if (!body.name) return { ok: false, error: 'name requis.' };
    if (!Number.isFinite(body.app_id)) return { ok: false, error: 'app_id requis.' };
    if (!body.id_type) return { ok: false, error: 'id_type requis.' };
    if (!body.owner) return { ok: false, error: 'owner requis.' };
    if (body.published === undefined) return { ok: false, error: 'published requis.' };

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
