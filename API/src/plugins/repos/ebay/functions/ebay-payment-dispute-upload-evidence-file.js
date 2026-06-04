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
    

    const body = utils.buildBodyFromInputs(d, [{"source":"contentBase64","target":"contentBase64","type":"text"},{"source":"contentType","target":"contentType","type":"text"},{"source":"fileName","target":"fileName","type":"text"}]);
    if (body && body.__invalid) return { ok: false, error: body.__invalid };

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
