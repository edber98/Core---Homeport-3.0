const { utils } = require('./utils');

const BODY_FIELDS = [
  {
    "key": "contact_id",
    "type": "text",
    "bodyPath": [
      "ContactID"
    ]
  },
  {
    "key": "merged_to_contact_id",
    "type": "text",
    "bodyPath": [
      "MergedToContactID"
    ]
  },
  {
    "key": "contact_number",
    "type": "text",
    "bodyPath": [
      "ContactNumber"
    ]
  },
  {
    "key": "account_number",
    "type": "text",
    "bodyPath": [
      "AccountNumber"
    ]
  },
  {
    "key": "contact_status",
    "type": "text",
    "bodyPath": [
      "ContactStatus"
    ]
  },
  {
    "key": "name",
    "type": "text",
    "bodyPath": [
      "Name"
    ]
  },
  {
    "key": "first_name",
    "type": "text",
    "bodyPath": [
      "FirstName"
    ]
  },
  {
    "key": "last_name",
    "type": "text",
    "bodyPath": [
      "LastName"
    ]
  },
  {
    "key": "company_number",
    "type": "text",
    "bodyPath": [
      "CompanyNumber"
    ]
  },
  {
    "key": "email_address",
    "type": "text",
    "bodyPath": [
      "EmailAddress"
    ]
  },
  {
    "key": "contact_persons",
    "type": "json",
    "bodyPath": [
      "ContactPersons"
    ]
  },
  {
    "key": "bank_account_details",
    "type": "text",
    "bodyPath": [
      "BankAccountDetails"
    ]
  },
  {
    "key": "tax_number",
    "type": "text",
    "bodyPath": [
      "TaxNumber"
    ]
  },
  {
    "key": "tax_number_type",
    "type": "text",
    "bodyPath": [
      "TaxNumberType"
    ]
  },
  {
    "key": "accounts_receivable_tax_type",
    "type": "text",
    "bodyPath": [
      "AccountsReceivableTaxType"
    ]
  },
  {
    "key": "accounts_payable_tax_type",
    "type": "text",
    "bodyPath": [
      "AccountsPayableTaxType"
    ]
  },
  {
    "key": "addresses",
    "type": "json",
    "bodyPath": [
      "Addresses"
    ]
  },
  {
    "key": "phones",
    "type": "json",
    "bodyPath": [
      "Phones"
    ]
  },
  {
    "key": "is_supplier",
    "type": "checkbox",
    "bodyPath": [
      "IsSupplier"
    ]
  },
  {
    "key": "is_customer",
    "type": "checkbox",
    "bodyPath": [
      "IsCustomer"
    ]
  },
  {
    "key": "sales_default_line_amount_type",
    "type": "text",
    "bodyPath": [
      "SalesDefaultLineAmountType"
    ]
  },
  {
    "key": "purchases_default_line_amount_type",
    "type": "text",
    "bodyPath": [
      "PurchasesDefaultLineAmountType"
    ]
  },
  {
    "key": "default_currency",
    "type": "text",
    "bodyPath": [
      "DefaultCurrency"
    ]
  },
  {
    "key": "xero_network_key",
    "type": "text",
    "bodyPath": [
      "XeroNetworkKey"
    ]
  },
  {
    "key": "sales_default_account_code",
    "type": "text",
    "bodyPath": [
      "SalesDefaultAccountCode"
    ]
  },
  {
    "key": "purchases_default_account_code",
    "type": "text",
    "bodyPath": [
      "PurchasesDefaultAccountCode"
    ]
  },
  {
    "key": "sales_tracking_categories",
    "type": "json",
    "bodyPath": [
      "SalesTrackingCategories"
    ]
  },
  {
    "key": "purchases_tracking_categories",
    "type": "json",
    "bodyPath": [
      "PurchasesTrackingCategories"
    ]
  },
  {
    "key": "tracking_category_name",
    "type": "text",
    "bodyPath": [
      "TrackingCategoryName"
    ]
  },
  {
    "key": "tracking_category_option",
    "type": "text",
    "bodyPath": [
      "TrackingCategoryOption"
    ]
  },
  {
    "key": "payment_terms_bills_day",
    "type": "number",
    "bodyPath": [
      "PaymentTerms",
      "Bills",
      "Day"
    ]
  },
  {
    "key": "payment_terms_bills_type",
    "type": "text",
    "bodyPath": [
      "PaymentTerms",
      "Bills",
      "Type"
    ]
  },
  {
    "key": "payment_terms_sales_day",
    "type": "number",
    "bodyPath": [
      "PaymentTerms",
      "Sales",
      "Day"
    ]
  },
  {
    "key": "payment_terms_sales_type",
    "type": "text",
    "bodyPath": [
      "PaymentTerms",
      "Sales",
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
    "key": "contact_groups",
    "type": "json",
    "bodyPath": [
      "ContactGroups"
    ]
  },
  {
    "key": "website",
    "type": "text",
    "bodyPath": [
      "Website"
    ]
  },
  {
    "key": "branding_theme_branding_theme_id",
    "type": "text",
    "bodyPath": [
      "BrandingTheme",
      "BrandingThemeID"
    ]
  },
  {
    "key": "branding_theme_name",
    "type": "text",
    "bodyPath": [
      "BrandingTheme",
      "Name"
    ]
  },
  {
    "key": "branding_theme_logo_url",
    "type": "text",
    "bodyPath": [
      "BrandingTheme",
      "LogoUrl"
    ]
  },
  {
    "key": "branding_theme_type",
    "type": "text",
    "bodyPath": [
      "BrandingTheme",
      "Type"
    ]
  },
  {
    "key": "branding_theme_sort_order",
    "type": "number",
    "bodyPath": [
      "BrandingTheme",
      "SortOrder"
    ]
  },
  {
    "key": "branding_theme_created_date_utc",
    "type": "text",
    "bodyPath": [
      "BrandingTheme",
      "CreatedDateUTC"
    ]
  },
  {
    "key": "batch_payments_bank_account_number",
    "type": "text",
    "bodyPath": [
      "BatchPayments",
      "BankAccountNumber"
    ]
  },
  {
    "key": "batch_payments_bank_account_name",
    "type": "text",
    "bodyPath": [
      "BatchPayments",
      "BankAccountName"
    ]
  },
  {
    "key": "batch_payments_details",
    "type": "text",
    "bodyPath": [
      "BatchPayments",
      "Details"
    ]
  },
  {
    "key": "batch_payments_code",
    "type": "text",
    "bodyPath": [
      "BatchPayments",
      "Code"
    ]
  },
  {
    "key": "batch_payments_reference",
    "type": "text",
    "bodyPath": [
      "BatchPayments",
      "Reference"
    ]
  },
  {
    "key": "discount",
    "type": "number",
    "bodyPath": [
      "Discount"
    ]
  },
  {
    "key": "balances_accounts_receivable_outstanding",
    "type": "number",
    "bodyPath": [
      "Balances",
      "AccountsReceivable",
      "Outstanding"
    ]
  },
  {
    "key": "balances_accounts_receivable_overdue",
    "type": "number",
    "bodyPath": [
      "Balances",
      "AccountsReceivable",
      "Overdue"
    ]
  },
  {
    "key": "balances_accounts_payable_outstanding",
    "type": "number",
    "bodyPath": [
      "Balances",
      "AccountsPayable",
      "Outstanding"
    ]
  },
  {
    "key": "balances_accounts_payable_overdue",
    "type": "number",
    "bodyPath": [
      "Balances",
      "AccountsPayable",
      "Overdue"
    ]
  },
  {
    "key": "attachments",
    "type": "json",
    "bodyPath": [
      "Attachments"
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
    "key": "validation_errors",
    "type": "json",
    "bodyPath": [
      "ValidationErrors"
    ]
  },
  {
    "key": "has_validation_errors",
    "type": "checkbox",
    "bodyPath": [
      "HasValidationErrors"
    ]
  },
  {
    "key": "status_attribute_string",
    "type": "text",
    "bodyPath": [
      "StatusAttributeString"
    ]
  }
];


module.exports = {
  async xero_contact_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/Contacts";
    

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
