const { utils } = require('./utils');

const BODY_FIELDS = [
  {
    "key": "narration",
    "type": "text",
    "bodyPath": [
      "Narration"
    ]
  },
  {
    "key": "journal_lines",
    "type": "json",
    "bodyPath": [
      "JournalLines"
    ]
  },
  {
    "key": "date",
    "type": "text",
    "bodyPath": [
      "Date"
    ]
  },
  {
    "key": "line_amount_types",
    "type": "text",
    "bodyPath": [
      "LineAmountTypes"
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
    "key": "url",
    "type": "text",
    "bodyPath": [
      "Url"
    ]
  },
  {
    "key": "show_on_cash_basis_reports",
    "type": "checkbox",
    "bodyPath": [
      "ShowOnCashBasisReports"
    ]
  },
  {
    "key": "has_attachments",
    "type": "checkbox",
    "bodyPath": [
      "HasAttachments"
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
    "key": "manual_journal_id",
    "type": "text",
    "bodyPath": [
      "ManualJournalID"
    ]
  },
  {
    "key": "status_attribute_string",
    "type": "text",
    "bodyPath": [
      "StatusAttributeString"
    ]
  },
  {
    "key": "warnings",
    "type": "json",
    "bodyPath": [
      "Warnings"
    ]
  },
  {
    "key": "validation_errors",
    "type": "json",
    "bodyPath": [
      "ValidationErrors"
    ]
  },
  {
    "key": "attachments",
    "type": "json",
    "bodyPath": [
      "Attachments"
    ]
  }
];


module.exports = {
  async xero_manual_journal_upsert(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/ManualJournals";
    

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
