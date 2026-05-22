const { utils } = require('./utils');

module.exports = {
  async lemlist_lead_delete_delete_or_unsubscribe_lead(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/campaigns/{campaignId}/leads/{leadId}";
    const campaignid = String(d.campaignid || '').trim();
    if (!campaignid) return { ok: false, error: 'campaignid requis.' };
    reqPath = reqPath.replace('{campaignid}', encodeURIComponent(campaignid));
    const leadid = String(d.leadid || '').trim();
    if (!leadid) return { ok: false, error: 'leadid requis.' };
    reqPath = reqPath.replace('{leadid}', encodeURIComponent(leadid));

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
