const { utils } = require('./utils');

module.exports = {
  async ebay_payment_dispute_upload_evidence_file(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://api.ebay.com/sell/fulfillment/v1/payment_dispute/{payment_dispute_id}/upload_evidence_file";
    const payment_dispute_id = String(d.payment_dispute_id || '').trim();
    if (!payment_dispute_id) return { ok: false, error: 'payment_dispute_id requis.' };
    reqPath = reqPath.replace('{payment_dispute_id}', encodeURIComponent(payment_dispute_id));

    const query = {};
    

    let body = undefined;
    if (d.body !== undefined && d.body !== null && d.body !== '') {
      if (typeof d.body === 'object') body = d.body;
      else {
        try { body = JSON.parse(String(d.body)); } catch { return { ok: false, error: 'JSON invalide dans body.' }; }
      }
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
