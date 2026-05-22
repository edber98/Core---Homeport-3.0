const { utils } = require('./utils');

module.exports = {
  async sendgrid_schedule_cancel_delete_campaigns_campaign_id_schedules(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/campaigns/{campaign_id}/schedules";
    const campaign_id = String(d.campaign_id || '').trim();
    if (!campaign_id) return { ok: false, error: 'campaign_id requis.' };
    reqPath = reqPath.replace('{campaign_id}', encodeURIComponent(campaign_id));

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
