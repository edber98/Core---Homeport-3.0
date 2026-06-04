const { utils } = require('./utils');

const BODY_FIELDS = [
  {
    "key": "status",
    "type": "text",
    "bodyPath": [
      "Status"
    ]
  }
];


module.exports = {
  async xero_batch_payment_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/BatchPayments/{batchPaymentId}";
    const batchpaymentid = String(d.batchpaymentid || '').trim();
    if (!batchpaymentid) return { ok: false, error: 'batchpaymentid requis.' };
    reqPath = reqPath.replace('{batchpaymentid}', encodeURIComponent(batchpaymentid));

    const query = {};
    let body;
    try {
      body = utils.buildBodyFromFields(d, BODY_FIELDS);
    } catch (e) {
      return { ok: false, error: e.message };
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
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
