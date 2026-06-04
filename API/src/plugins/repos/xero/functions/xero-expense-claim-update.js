const { utils } = require('./utils');

const BODY_FIELDS = [
  {
    "key": "expense_claim_id",
    "type": "text",
    "bodyPath": [
      "ExpenseClaimID"
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
    "key": "payments",
    "type": "json",
    "bodyPath": [
      "Payments"
    ]
  },
  {
    "key": "user_user_id",
    "type": "text",
    "bodyPath": [
      "User",
      "UserID"
    ]
  },
  {
    "key": "user_email_address",
    "type": "text",
    "bodyPath": [
      "User",
      "EmailAddress"
    ]
  },
  {
    "key": "user_first_name",
    "type": "text",
    "bodyPath": [
      "User",
      "FirstName"
    ]
  },
  {
    "key": "user_last_name",
    "type": "text",
    "bodyPath": [
      "User",
      "LastName"
    ]
  },
  {
    "key": "user_updated_date_utc",
    "type": "text",
    "bodyPath": [
      "User",
      "UpdatedDateUTC"
    ]
  },
  {
    "key": "user_is_subscriber",
    "type": "checkbox",
    "bodyPath": [
      "User",
      "IsSubscriber"
    ]
  },
  {
    "key": "user_organisation_role",
    "type": "text",
    "bodyPath": [
      "User",
      "OrganisationRole"
    ]
  },
  {
    "key": "receipts",
    "type": "json",
    "bodyPath": [
      "Receipts"
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
    "key": "total",
    "type": "number",
    "bodyPath": [
      "Total"
    ]
  },
  {
    "key": "amount_due",
    "type": "number",
    "bodyPath": [
      "AmountDue"
    ]
  },
  {
    "key": "amount_paid",
    "type": "number",
    "bodyPath": [
      "AmountPaid"
    ]
  },
  {
    "key": "payment_due_date",
    "type": "text",
    "bodyPath": [
      "PaymentDueDate"
    ]
  },
  {
    "key": "reporting_date",
    "type": "text",
    "bodyPath": [
      "ReportingDate"
    ]
  },
  {
    "key": "receipt_id",
    "type": "text",
    "bodyPath": [
      "ReceiptID"
    ]
  }
];


module.exports = {
  async xero_expense_claim_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/ExpenseClaims/{expenseClaimId}";
    const expenseclaimid = String(d.expenseclaimid || '').trim();
    if (!expenseclaimid) return { ok: false, error: 'expenseclaimid requis.' };
    reqPath = reqPath.replace('{expenseclaimid}', encodeURIComponent(expenseclaimid));

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
