const { utils } = require('./utils');

const BODY_FIELDS = [
  {
    "key": "from_bank_account_code",
    "type": "text",
    "bodyPath": [
      "FromBankAccount",
      "Code"
    ]
  },
  {
    "key": "from_bank_account_name",
    "type": "text",
    "bodyPath": [
      "FromBankAccount",
      "Name"
    ]
  },
  {
    "key": "from_bank_account_account_id",
    "type": "text",
    "bodyPath": [
      "FromBankAccount",
      "AccountID"
    ]
  },
  {
    "key": "from_bank_account_type",
    "type": "text",
    "bodyPath": [
      "FromBankAccount",
      "Type"
    ]
  },
  {
    "key": "from_bank_account_bank_account_number",
    "type": "text",
    "bodyPath": [
      "FromBankAccount",
      "BankAccountNumber"
    ]
  },
  {
    "key": "from_bank_account_status",
    "type": "text",
    "bodyPath": [
      "FromBankAccount",
      "Status"
    ]
  },
  {
    "key": "from_bank_account_description",
    "type": "text",
    "bodyPath": [
      "FromBankAccount",
      "Description"
    ]
  },
  {
    "key": "from_bank_account_bank_account_type",
    "type": "text",
    "bodyPath": [
      "FromBankAccount",
      "BankAccountType"
    ]
  },
  {
    "key": "from_bank_account_currency_code",
    "type": "text",
    "bodyPath": [
      "FromBankAccount",
      "CurrencyCode"
    ]
  },
  {
    "key": "from_bank_account_tax_type",
    "type": "text",
    "bodyPath": [
      "FromBankAccount",
      "TaxType"
    ]
  },
  {
    "key": "from_bank_account_enable_payments_to_account",
    "type": "checkbox",
    "bodyPath": [
      "FromBankAccount",
      "EnablePaymentsToAccount"
    ]
  },
  {
    "key": "from_bank_account_show_in_expense_claims",
    "type": "checkbox",
    "bodyPath": [
      "FromBankAccount",
      "ShowInExpenseClaims"
    ]
  },
  {
    "key": "from_bank_account_class",
    "type": "text",
    "bodyPath": [
      "FromBankAccount",
      "Class"
    ]
  },
  {
    "key": "from_bank_account_system_account",
    "type": "text",
    "bodyPath": [
      "FromBankAccount",
      "SystemAccount"
    ]
  },
  {
    "key": "from_bank_account_reporting_code",
    "type": "text",
    "bodyPath": [
      "FromBankAccount",
      "ReportingCode"
    ]
  },
  {
    "key": "from_bank_account_reporting_code_name",
    "type": "text",
    "bodyPath": [
      "FromBankAccount",
      "ReportingCodeName"
    ]
  },
  {
    "key": "from_bank_account_has_attachments",
    "type": "checkbox",
    "bodyPath": [
      "FromBankAccount",
      "HasAttachments"
    ]
  },
  {
    "key": "from_bank_account_updated_date_utc",
    "type": "text",
    "bodyPath": [
      "FromBankAccount",
      "UpdatedDateUTC"
    ]
  },
  {
    "key": "from_bank_account_add_to_watchlist",
    "type": "checkbox",
    "bodyPath": [
      "FromBankAccount",
      "AddToWatchlist"
    ]
  },
  {
    "key": "from_bank_account_validation_errors",
    "type": "json",
    "bodyPath": [
      "FromBankAccount",
      "ValidationErrors"
    ]
  },
  {
    "key": "to_bank_account_code",
    "type": "text",
    "bodyPath": [
      "ToBankAccount",
      "Code"
    ]
  },
  {
    "key": "to_bank_account_name",
    "type": "text",
    "bodyPath": [
      "ToBankAccount",
      "Name"
    ]
  },
  {
    "key": "to_bank_account_account_id",
    "type": "text",
    "bodyPath": [
      "ToBankAccount",
      "AccountID"
    ]
  },
  {
    "key": "to_bank_account_type",
    "type": "text",
    "bodyPath": [
      "ToBankAccount",
      "Type"
    ]
  },
  {
    "key": "to_bank_account_bank_account_number",
    "type": "text",
    "bodyPath": [
      "ToBankAccount",
      "BankAccountNumber"
    ]
  },
  {
    "key": "to_bank_account_status",
    "type": "text",
    "bodyPath": [
      "ToBankAccount",
      "Status"
    ]
  },
  {
    "key": "to_bank_account_description",
    "type": "text",
    "bodyPath": [
      "ToBankAccount",
      "Description"
    ]
  },
  {
    "key": "to_bank_account_bank_account_type",
    "type": "text",
    "bodyPath": [
      "ToBankAccount",
      "BankAccountType"
    ]
  },
  {
    "key": "to_bank_account_currency_code",
    "type": "text",
    "bodyPath": [
      "ToBankAccount",
      "CurrencyCode"
    ]
  },
  {
    "key": "to_bank_account_tax_type",
    "type": "text",
    "bodyPath": [
      "ToBankAccount",
      "TaxType"
    ]
  },
  {
    "key": "to_bank_account_enable_payments_to_account",
    "type": "checkbox",
    "bodyPath": [
      "ToBankAccount",
      "EnablePaymentsToAccount"
    ]
  },
  {
    "key": "to_bank_account_show_in_expense_claims",
    "type": "checkbox",
    "bodyPath": [
      "ToBankAccount",
      "ShowInExpenseClaims"
    ]
  },
  {
    "key": "to_bank_account_class",
    "type": "text",
    "bodyPath": [
      "ToBankAccount",
      "Class"
    ]
  },
  {
    "key": "to_bank_account_system_account",
    "type": "text",
    "bodyPath": [
      "ToBankAccount",
      "SystemAccount"
    ]
  },
  {
    "key": "to_bank_account_reporting_code",
    "type": "text",
    "bodyPath": [
      "ToBankAccount",
      "ReportingCode"
    ]
  },
  {
    "key": "to_bank_account_reporting_code_name",
    "type": "text",
    "bodyPath": [
      "ToBankAccount",
      "ReportingCodeName"
    ]
  },
  {
    "key": "to_bank_account_has_attachments",
    "type": "checkbox",
    "bodyPath": [
      "ToBankAccount",
      "HasAttachments"
    ]
  },
  {
    "key": "to_bank_account_updated_date_utc",
    "type": "text",
    "bodyPath": [
      "ToBankAccount",
      "UpdatedDateUTC"
    ]
  },
  {
    "key": "to_bank_account_add_to_watchlist",
    "type": "checkbox",
    "bodyPath": [
      "ToBankAccount",
      "AddToWatchlist"
    ]
  },
  {
    "key": "to_bank_account_validation_errors",
    "type": "json",
    "bodyPath": [
      "ToBankAccount",
      "ValidationErrors"
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
    "key": "date",
    "type": "text",
    "bodyPath": [
      "Date"
    ]
  },
  {
    "key": "bank_transfer_id",
    "type": "text",
    "bodyPath": [
      "BankTransferID"
    ]
  },
  {
    "key": "currency_rate",
    "type": "number",
    "bodyPath": [
      "CurrencyRate"
    ]
  },
  {
    "key": "from_bank_transaction_id",
    "type": "text",
    "bodyPath": [
      "FromBankTransactionID"
    ]
  },
  {
    "key": "to_bank_transaction_id",
    "type": "text",
    "bodyPath": [
      "ToBankTransactionID"
    ]
  },
  {
    "key": "from_is_reconciled",
    "type": "checkbox",
    "bodyPath": [
      "FromIsReconciled"
    ]
  },
  {
    "key": "to_is_reconciled",
    "type": "checkbox",
    "bodyPath": [
      "ToIsReconciled"
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
    "key": "has_attachments",
    "type": "checkbox",
    "bodyPath": [
      "HasAttachments"
    ]
  },
  {
    "key": "created_date_utc",
    "type": "text",
    "bodyPath": [
      "CreatedDateUTC"
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
  async xero_bank_transfer_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/BankTransfers";
    

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
