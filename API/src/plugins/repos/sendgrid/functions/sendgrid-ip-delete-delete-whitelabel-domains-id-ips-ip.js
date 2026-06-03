const { utils } = require('./utils');

module.exports = {
  async sendgrid_ip_delete_delete_whitelabel_domains_id_ips_ip(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/whitelabel/domains/{id}/ips/{ip}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));
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
