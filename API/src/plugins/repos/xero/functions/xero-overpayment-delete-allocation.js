const { utils } = require('./utils');

module.exports = {
  async xero_overpayment_delete_allocation(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/Overpayments/{overpaymentId}/Allocations/{allocationId}";
    const overpaymentid = String(d.overpaymentid || '').trim();
    if (!overpaymentid) return { ok: false, error: 'overpaymentid requis.' };
    reqPath = reqPath.replace('{overpaymentid}', encodeURIComponent(overpaymentid));
    const allocationid = String(d.allocationid || '').trim();
    if (!allocationid) return { ok: false, error: 'allocationid requis.' };
    reqPath = reqPath.replace('{allocationid}', encodeURIComponent(allocationid));

    const query = {};
    

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
