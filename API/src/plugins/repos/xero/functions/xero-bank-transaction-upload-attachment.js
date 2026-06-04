const { utils } = require('./utils');

const BODY_FIELDS = [
  {
    "key": "content_base64",
    "type": "textarea",
    "bodyPath": [
      "contentBase64"
    ]
  },
  {
    "key": "content",
    "type": "textarea",
    "bodyPath": [
      "content"
    ]
  },
  {
    "key": "content_type",
    "type": "text",
    "bodyPath": [
      "contentType"
    ]
  },
  {
    "key": "include_online",
    "type": "checkbox",
    "bodyPath": [
      "includeOnline"
    ]
  }
];


module.exports = {
  async xero_bank_transaction_upload_attachment(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/BankTransactions/{bankTransactionId}/Attachments/{fileName}";
    const banktransactionid = String(d.banktransactionid || '').trim();
    if (!banktransactionid) return { ok: false, error: 'banktransactionid requis.' };
    reqPath = reqPath.replace('{banktransactionid}', encodeURIComponent(banktransactionid));
    const filename = String(d.filename || '').trim();
    if (!filename) return { ok: false, error: 'filename requis.' };
    reqPath = reqPath.replace('{filename}', encodeURIComponent(filename));

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
