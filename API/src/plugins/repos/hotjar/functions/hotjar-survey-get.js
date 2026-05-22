const { utils } = require('./utils');

module.exports = {
  async hotjar_survey_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/sites/{site_id}/surveys/{survey_id}";
    const site_id = String(d.site_id || '').trim();
    if (!site_id) return { ok: false, error: 'site_id requis.' };
    reqPath = reqPath.replace('{site_id}', encodeURIComponent(site_id));
    const survey_id = String(d.survey_id || '').trim();
    if (!survey_id) return { ok: false, error: 'survey_id requis.' };
    reqPath = reqPath.replace('{survey_id}', encodeURIComponent(survey_id));

    let query = {};
    try { query = utils.parseJsonInput(d.query, 'query', { defaultValue: {}, allowArray: false }) || {}; }
    catch (e) { return { ok: false, error: e.message }; }

    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    let headers = {};
    try { headers = utils.parseJsonInput(d.headers, 'headers', { defaultValue: {}, allowArray: false }) || {}; }
    catch (e) { return { ok: false, error: e.message }; }

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'GET', query, body, headers });
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
