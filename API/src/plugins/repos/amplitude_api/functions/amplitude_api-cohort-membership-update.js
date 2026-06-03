const { utils } = require('./utils');

module.exports = {
  async amplitude_api_cohort_membership_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/3/cohorts/membership";
    

    let query = {};
    try { query = utils.parseJsonInput(d.query, 'query', { defaultValue: {}, allowArray: false }) || {}; }
    catch (e) { return { ok: false, error: e.message }; }

    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    let headers = {};
    try { headers = utils.parseJsonInput(d.headers, 'headers', { defaultValue: {}, allowArray: false }) || {}; }
    catch (e) { return { ok: false, error: e.message }; }

    let memberships;
    try { memberships = utils.parseJsonInput(d.memberships, 'memberships', { defaultValue: undefined, allowArray: true, allowObject: false }); }
    catch (e) { return { ok: false, error: e.message }; }
    if (!Array.isArray(memberships) || !memberships.length) return { ok: false, error: 'memberships requis et doit être un tableau JSON non vide.' };
    const body = {};
    if (d.cohort_id !== undefined && d.cohort_id !== null && d.cohort_id !== '') body.cohort_id = d.cohort_id;
    if (d.count_group !== undefined && d.count_group !== null && d.count_group !== '') body.count_group = d.count_group;
    body.memberships = memberships;
    if (d.skip_invalid_ids !== undefined && d.skip_invalid_ids !== null && d.skip_invalid_ids !== '') body.skip_invalid_ids = Boolean(d.skip_invalid_ids);
    if (!body.cohort_id) return { ok: false, error: 'cohort_id requis.' };

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
