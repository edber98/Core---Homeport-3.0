const { utils } = require('./utils');

module.exports = {
  async sendgrid_subuser_delete_delete_subusers_subuser_name(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/subusers/{subuser_name}";
    const subuser_name = String(d.subuser_name || '').trim();
    if (!subuser_name) return { ok: false, error: 'subuser_name requis.' };
    reqPath = reqPath.replace('{subuser_name}', encodeURIComponent(subuser_name));

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
