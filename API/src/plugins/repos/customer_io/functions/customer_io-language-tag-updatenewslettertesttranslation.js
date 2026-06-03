const { utils } = require('./utils');

module.exports = {
  async customer_io_language_tag_updatenewslettertesttranslation(node, msg, inputs, opts) {
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

    let body = undefined;
    if (d.body !== undefined && d.body !== null && d.body !== '') {
      if (typeof d.body === 'object') body = d.body;
      else {
        try { body = JSON.parse(String(d.body)); } catch { return { ok: false, error: 'JSON invalide dans body.' }; }
      }
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
