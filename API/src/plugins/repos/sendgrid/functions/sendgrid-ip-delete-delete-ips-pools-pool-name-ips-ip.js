const { utils } = require('./utils');

module.exports = {
  async sendgrid_ip_delete_delete_ips_pools_pool_name_ips_ip(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/ips/pools/{pool_name}/ips/{ip}";
    const pool_name = String(d.pool_name || '').trim();
    if (!pool_name) return { ok: false, error: 'pool_name requis.' };
    reqPath = reqPath.replace('{pool_name}', encodeURIComponent(pool_name));
    const ip = String(d.ip || '').trim();
    if (!ip) return { ok: false, error: 'ip requis.' };
    reqPath = reqPath.replace('{ip}', encodeURIComponent(ip));

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
