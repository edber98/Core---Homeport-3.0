const { utils } = require('./utils');

module.exports = {
  async revolut_business_payment_draft_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/payment-drafts/{paymentDraftId}";
    const paymentdraftid = String(d.paymentdraftid || '').trim();
    if (!paymentdraftid) return { ok: false, error: 'paymentdraftid requis.' };
    reqPath = reqPath.replace('{paymentdraftid}', encodeURIComponent(paymentdraftid));

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
