const { utils } = require('./utils');

module.exports = {
  async sendgrid_setting_delete_delete_user_webhooks_parse_settings_hostname(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/user/webhooks/parse/settings/{hostname}";
    const hostname = String(d.hostname || '').trim();
    if (!hostname) return { ok: false, error: 'hostname requis.' };
    reqPath = reqPath.replace('{hostname}', encodeURIComponent(hostname));

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
