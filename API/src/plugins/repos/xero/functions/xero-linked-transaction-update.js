const { utils } = require('./utils');

const BODY_FIELDS = [
  {
    "key": "source_transaction_id",
    "type": "text",
    "bodyPath": [
      "SourceTransactionID"
    ]
  },
  {
    "key": "source_line_item_id",
    "type": "text",
    "bodyPath": [
      "SourceLineItemID"
    ]
  },
  {
    "key": "contact_id",
    "type": "text",
    "bodyPath": [
      "ContactID"
    ]
  },
  {
    "key": "target_transaction_id",
    "type": "text",
    "bodyPath": [
      "TargetTransactionID"
    ]
  },
  {
    "key": "target_line_item_id",
    "type": "text",
    "bodyPath": [
      "TargetLineItemID"
    ]
  },
  {
    "key": "linked_transaction_id",
    "type": "text",
    "bodyPath": [
      "LinkedTransactionID"
    ]
  },
  {
    "key": "status",
    "type": "text",
    "bodyPath": [
      "Status"
    ]
  },
  {
    "key": "type",
    "type": "text",
    "bodyPath": [
      "Type"
    ]
  },
  {
    "key": "updated_date_utc",
    "type": "text",
    "bodyPath": [
      "UpdatedDateUTC"
    ]
  },
  {
    "key": "source_transaction_type_code",
    "type": "text",
    "bodyPath": [
      "SourceTransactionTypeCode"
    ]
  },
  {
    "key": "validation_errors",
    "type": "json",
    "bodyPath": [
      "ValidationErrors"
    ]
  }
];


module.exports = {
  async xero_linked_transaction_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/LinkedTransactions/{linkedTransactionId}";
    const linkedtransactionid = String(d.linkedtransactionid || '').trim();
    if (!linkedtransactionid) return { ok: false, error: 'linkedtransactionid requis.' };
    reqPath = reqPath.replace('{linkedtransactionid}', encodeURIComponent(linkedtransactionid));

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
