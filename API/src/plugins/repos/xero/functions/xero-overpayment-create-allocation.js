const { utils } = require('./utils');

module.exports = {
  async xero_overpayment_create_allocation(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/Overpayments/{overpaymentId}/Allocations";
    const overpaymentid = String(d.overpaymentid || '').trim();
    if (!overpaymentid) return { ok: false, error: 'overpaymentid requis.' };
    reqPath = reqPath.replace('{overpaymentid}', encodeURIComponent(overpaymentid));

    const query = {};
    

    let body = undefined;
    if (d.body !== undefined && d.body !== null && d.body !== '') {
      if (typeof d.body === 'object') body = d.body;
      else {
        try { body = JSON.parse(String(d.body)); } catch { return { ok: false, error: 'JSON invalide dans body.' }; }
      }
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
