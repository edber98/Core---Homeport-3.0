const { utils } = require('./utils');

const BODY_FIELDS = [
  {
    "key": "account_code",
    "type": "text",
    "bodyPath": [
      "Account",
      "Code"
    ]
  },
  {
    "key": "account_name",
    "type": "text",
    "bodyPath": [
      "Account",
      "Name"
    ]
  },
  {
    "key": "account_account_id",
    "type": "text",
    "bodyPath": [
      "Account",
      "AccountID"
    ]
  },
  {
    "key": "account_type",
    "type": "text",
    "bodyPath": [
      "Account",
      "Type"
    ]
  },
  {
    "key": "account_bank_account_number",
    "type": "text",
    "bodyPath": [
      "Account",
      "BankAccountNumber"
    ]
  },
  {
    "key": "account_status",
    "type": "text",
    "bodyPath": [
      "Account",
      "Status"
    ]
  },
  {
    "key": "account_description",
    "type": "text",
    "bodyPath": [
      "Account",
      "Description"
    ]
  },
  {
    "key": "account_bank_account_type",
    "type": "text",
    "bodyPath": [
      "Account",
      "BankAccountType"
    ]
  },
  {
    "key": "account_currency_code",
    "type": "text",
    "bodyPath": [
      "Account",
      "CurrencyCode"
    ]
  },
  {
    "key": "account_tax_type",
    "type": "text",
    "bodyPath": [
      "Account",
      "TaxType"
    ]
  },
  {
    "key": "account_enable_payments_to_account",
    "type": "checkbox",
    "bodyPath": [
      "Account",
      "EnablePaymentsToAccount"
    ]
  },
  {
    "key": "account_show_in_expense_claims",
    "type": "checkbox",
    "bodyPath": [
      "Account",
      "ShowInExpenseClaims"
    ]
  },
  {
    "key": "account_class",
    "type": "text",
    "bodyPath": [
      "Account",
      "Class"
    ]
  },
  {
    "key": "account_system_account",
    "type": "text",
    "bodyPath": [
      "Account",
      "SystemAccount"
    ]
  },
  {
    "key": "account_reporting_code",
    "type": "text",
    "bodyPath": [
      "Account",
      "ReportingCode"
    ]
  },
  {
    "key": "account_reporting_code_name",
    "type": "text",
    "bodyPath": [
      "Account",
      "ReportingCodeName"
    ]
  },
  {
    "key": "account_has_attachments",
    "type": "checkbox",
    "bodyPath": [
      "Account",
      "HasAttachments"
    ]
  },
  {
    "key": "account_updated_date_utc",
    "type": "text",
    "bodyPath": [
      "Account",
      "UpdatedDateUTC"
    ]
  },
  {
    "key": "account_add_to_watchlist",
    "type": "checkbox",
    "bodyPath": [
      "Account",
      "AddToWatchlist"
    ]
  },
  {
    "key": "account_validation_errors",
    "type": "json",
    "bodyPath": [
      "Account",
      "ValidationErrors"
    ]
  },
  {
    "key": "reference",
    "type": "text",
    "bodyPath": [
      "Reference"
    ]
  },
  {
    "key": "particulars",
    "type": "text",
    "bodyPath": [
      "Particulars"
    ]
  },
  {
    "key": "code",
    "type": "text",
    "bodyPath": [
      "Code"
    ]
  },
  {
    "key": "details",
    "type": "text",
    "bodyPath": [
      "Details"
    ]
  },
  {
    "key": "narrative",
    "type": "text",
    "bodyPath": [
      "Narrative"
    ]
  },
  {
    "key": "batch_payment_id",
    "type": "text",
    "bodyPath": [
      "BatchPaymentID"
    ]
  },
  {
    "key": "date_string",
    "type": "text",
    "bodyPath": [
      "DateString"
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
    "key": "amount",
    "type": "number",
    "bodyPath": [
      "Amount"
    ]
  },
  {
    "key": "payments",
    "type": "json",
    "bodyPath": [
      "Payments"
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
    "key": "status",
    "type": "text",
    "bodyPath": [
      "Status"
    ]
  },
  {
    "key": "total_amount",
    "type": "number",
    "bodyPath": [
      "TotalAmount"
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
    "key": "is_reconciled",
    "type": "checkbox",
    "bodyPath": [
      "IsReconciled"
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
  async xero_batch_payment_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/BatchPayments";
    

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
