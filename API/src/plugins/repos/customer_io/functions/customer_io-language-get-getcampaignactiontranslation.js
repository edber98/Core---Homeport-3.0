const { utils } = require('./utils');

module.exports = {
  async customer_io_language_get_getcampaignactiontranslation(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/campaigns/{campaign_id}/actions/{action_id}/language/{language}";
    const campaign_id = String(d.campaign_id || '').trim();
    if (!campaign_id) return { ok: false, error: 'campaign_id requis.' };
    reqPath = reqPath.replace('{campaign_id}', encodeURIComponent(campaign_id));
    const action_id = String(d.action_id || '').trim();
    if (!action_id) return { ok: false, error: 'action_id requis.' };
    reqPath = reqPath.replace('{action_id}', encodeURIComponent(action_id));
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
