const { utils } = require('./utils');

module.exports = {
  async sendgrid_whitelist_delete_delete_access_settings_whitelist_rule_id(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/access_settings/whitelist/{rule_id}";
    const rule_id = String(d.rule_id || '').trim();
    if (!rule_id) return { ok: false, error: 'rule_id requis.' };
    reqPath = reqPath.replace('{rule_id}', encodeURIComponent(rule_id));

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
