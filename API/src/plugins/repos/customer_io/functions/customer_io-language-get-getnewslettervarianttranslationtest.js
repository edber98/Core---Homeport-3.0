const { utils } = require('./utils');

module.exports = {
  async customer_io_language_get_getnewslettervarianttranslationtest(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/newsletters/{newsletter_id}/test_group/{test_group_id}/language/{language}";
    const newsletter_id = String(d.newsletter_id || '').trim();
    if (!newsletter_id) return { ok: false, error: 'newsletter_id requis.' };
    reqPath = reqPath.replace('{newsletter_id}', encodeURIComponent(newsletter_id));
    const test_group_id = String(d.test_group_id || '').trim();
    if (!test_group_id) return { ok: false, error: 'test_group_id requis.' };
    reqPath = reqPath.replace('{test_group_id}', encodeURIComponent(test_group_id));
    const language = String(d.language || '').trim();
    if (!language) return { ok: false, error: 'language requis.' };
    reqPath = reqPath.replace('{language}', encodeURIComponent(language));

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
