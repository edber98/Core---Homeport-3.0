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
  async xero_invoice_send_email(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/Invoices/{invoiceId}/Email";
    const invoiceid = String(d.invoiceid || '').trim();
    if (!invoiceid) return { ok: false, error: 'invoiceid requis.' };
    reqPath = reqPath.replace('{invoiceid}', encodeURIComponent(invoiceid));

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

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
