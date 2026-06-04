const { utils } = require('./utils');

const BODY_FIELDS = [
  {
    "key": "details",
    "type": "textarea",
    "bodyPath": [
      "Details"
    ]
  }
];


module.exports = {
  async xero_repeating_invoice_create_history(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/RepeatingInvoices/{repeatingInvoiceId}/History";
    const repeatinginvoiceid = String(d.repeatinginvoiceid || '').trim();
    if (!repeatinginvoiceid) return { ok: false, error: 'repeatinginvoiceid requis.' };
    reqPath = reqPath.replace('{repeatinginvoiceid}', encodeURIComponent(repeatinginvoiceid));

    const query = {};
    let body;
    try {
      body = utils.buildBodyFromFields(d, BODY_FIELDS);
    } catch (e) {
      return { ok: false, error: e.message };
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
