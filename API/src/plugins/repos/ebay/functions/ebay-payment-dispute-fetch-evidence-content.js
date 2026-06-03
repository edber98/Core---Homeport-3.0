const { utils } = require('./utils');

module.exports = {
  async ebay_payment_dispute_fetch_evidence_content(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://api.ebay.com/sell/fulfillment/v1/payment_dispute/{payment_dispute_id}/fetch_evidence_content";
    const payment_dispute_id = String(d.payment_dispute_id || '').trim();
    if (!payment_dispute_id) return { ok: false, error: 'payment_dispute_id requis.' };
    reqPath = reqPath.replace('{payment_dispute_id}', encodeURIComponent(payment_dispute_id));

    const query = {};
    if (d.file_id !== undefined && d.file_id !== null && d.file_id !== '') query["file_id"] = d.file_id;

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'GET', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      ...(r && typeof r === 'object' ? r : { value: r }),
      id: r.id || r.uuid || r.key || '',
      name: r.name || r.title || '',
      url: r.url || r.html_url || '',
      status: r.status || r.state || '',
      created_at: r.created_at || r.createdAt || '',
      updated_at: r.updated_at || r.updatedAt || '',
      raw: r
    };
  }
};
