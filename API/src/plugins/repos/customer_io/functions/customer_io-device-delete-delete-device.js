const { utils } = require('./utils');

module.exports = {
  async customer_io_device_delete_delete_device(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v1/customers/{identifier}/devices/{device_id}";
    const identifier = String(d.identifier || '').trim();
    if (!identifier) return { ok: false, error: 'identifier requis.' };
    reqPath = reqPath.replace('{identifier}', encodeURIComponent(identifier));
    const device_id = String(d.device_id || '').trim();
    if (!device_id) return { ok: false, error: 'device_id requis.' };
    reqPath = reqPath.replace('{device_id}', encodeURIComponent(device_id));

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
