const { utils } = require('./utils');

module.exports = {
  async smartlead_lead_delete_api_reference_leads_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v1/campaigns/{campaign_id}/leads/{lead_id}";
    const campaign_id = String(d.campaign_id || '').trim();
    if (!campaign_id) return { ok: false, error: 'campaign_id requis.' };
    reqPath = reqPath.replace('{campaign_id}', encodeURIComponent(campaign_id));
    const lead_id = String(d.lead_id || '').trim();
    if (!lead_id) return { ok: false, error: 'lead_id requis.' };
    reqPath = reqPath.replace('{lead_id}', encodeURIComponent(lead_id));

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
