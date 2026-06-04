const { utils } = require('./utils');

const BODY_FIELDS = [
  {
    "key": "quote_id",
    "type": "text",
    "bodyPath": [
      "QuoteID"
    ]
  },
  {
    "key": "quote_number",
    "type": "text",
    "bodyPath": [
      "QuoteNumber"
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
    "key": "terms",
    "type": "text",
    "bodyPath": [
      "Terms"
    ]
  },
  {
    "key": "contact_contact_id",
    "type": "text",
    "bodyPath": [
      "Contact",
      "ContactID"
    ]
  },
  {
    "key": "contact_merged_to_contact_id",
    "type": "text",
    "bodyPath": [
      "Contact",
      "MergedToContactID"
    ]
  },
  {
    "key": "contact_contact_number",
    "type": "text",
    "bodyPath": [
      "Contact",
      "ContactNumber"
    ]
  },
  {
    "key": "contact_account_number",
    "type": "text",
    "bodyPath": [
      "Contact",
      "AccountNumber"
    ]
  },
  {
    "key": "contact_contact_status",
    "type": "text",
    "bodyPath": [
      "Contact",
      "ContactStatus"
    ]
  },
  {
    "key": "contact_name",
    "type": "text",
    "bodyPath": [
      "Contact",
      "Name"
    ]
  },
  {
    "key": "contact_first_name",
    "type": "text",
    "bodyPath": [
      "Contact",
      "FirstName"
    ]
  },
  {
    "key": "contact_last_name",
    "type": "text",
    "bodyPath": [
      "Contact",
      "LastName"
    ]
  },
  {
    "key": "contact_company_number",
    "type": "text",
    "bodyPath": [
      "Contact",
      "CompanyNumber"
    ]
  },
  {
    "key": "contact_email_address",
    "type": "text",
    "bodyPath": [
      "Contact",
      "EmailAddress"
    ]
  },
  {
    "key": "contact_contact_persons",
    "type": "json",
    "bodyPath": [
      "Contact",
      "ContactPersons"
    ]
  },
  {
    "key": "contact_bank_account_details",
    "type": "text",
    "bodyPath": [
      "Contact",
      "BankAccountDetails"
    ]
  },
  {
    "key": "contact_tax_number",
    "type": "text",
    "bodyPath": [
      "Contact",
      "TaxNumber"
    ]
  },
  {
    "key": "contact_tax_number_type",
    "type": "text",
    "bodyPath": [
      "Contact",
      "TaxNumberType"
    ]
  },
  {
    "key": "contact_accounts_receivable_tax_type",
    "type": "text",
    "bodyPath": [
      "Contact",
      "AccountsReceivableTaxType"
    ]
  },
  {
    "key": "contact_accounts_payable_tax_type",
    "type": "text",
    "bodyPath": [
      "Contact",
      "AccountsPayableTaxType"
    ]
  },
  {
    "key": "contact_addresses",
    "type": "json",
    "bodyPath": [
      "Contact",
      "Addresses"
    ]
  },
  {
    "key": "contact_phones",
    "type": "json",
    "bodyPath": [
      "Contact",
      "Phones"
    ]
  },
  {
    "key": "contact_is_supplier",
    "type": "checkbox",
    "bodyPath": [
      "Contact",
      "IsSupplier"
    ]
  },
  {
    "key": "contact_is_customer",
    "type": "checkbox",
    "bodyPath": [
      "Contact",
      "IsCustomer"
    ]
  },
  {
    "key": "contact_sales_default_line_amount_type",
    "type": "text",
    "bodyPath": [
      "Contact",
      "SalesDefaultLineAmountType"
    ]
  },
  {
    "key": "contact_purchases_default_line_amount_type",
    "type": "text",
    "bodyPath": [
      "Contact",
      "PurchasesDefaultLineAmountType"
    ]
  },
  {
    "key": "contact_default_currency",
    "type": "text",
    "bodyPath": [
      "Contact",
      "DefaultCurrency"
    ]
  },
  {
    "key": "contact_xero_network_key",
    "type": "text",
    "bodyPath": [
      "Contact",
      "XeroNetworkKey"
    ]
  },
  {
    "key": "contact_sales_default_account_code",
    "type": "text",
    "bodyPath": [
      "Contact",
      "SalesDefaultAccountCode"
    ]
  },
  {
    "key": "contact_purchases_default_account_code",
    "type": "text",
    "bodyPath": [
      "Contact",
      "PurchasesDefaultAccountCode"
    ]
  },
  {
    "key": "contact_sales_tracking_categories",
    "type": "json",
    "bodyPath": [
      "Contact",
      "SalesTrackingCategories"
    ]
  },
  {
    "key": "contact_purchases_tracking_categories",
    "type": "json",
    "bodyPath": [
      "Contact",
      "PurchasesTrackingCategories"
    ]
  },
  {
    "key": "contact_tracking_category_name",
    "type": "text",
    "bodyPath": [
      "Contact",
      "TrackingCategoryName"
    ]
  },
  {
    "key": "contact_tracking_category_option",
    "type": "text",
    "bodyPath": [
      "Contact",
      "TrackingCategoryOption"
    ]
  },
  {
    "key": "contact_payment_terms_bills_day",
    "type": "number",
    "bodyPath": [
      "Contact",
      "PaymentTerms",
      "Bills",
      "Day"
    ]
  },
  {
    "key": "contact_payment_terms_bills_type",
    "type": "text",
    "bodyPath": [
      "Contact",
      "PaymentTerms",
      "Bills",
      "Type"
    ]
  },
  {
    "key": "contact_payment_terms_sales_day",
    "type": "number",
    "bodyPath": [
      "Contact",
      "PaymentTerms",
      "Sales",
      "Day"
    ]
  },
  {
    "key": "contact_payment_terms_sales_type",
    "type": "text",
    "bodyPath": [
      "Contact",
      "PaymentTerms",
      "Sales",
      "Type"
    ]
  },
  {
    "key": "contact_updated_date_utc",
    "type": "text",
    "bodyPath": [
      "Contact",
      "UpdatedDateUTC"
    ]
  },
  {
    "key": "contact_contact_groups",
    "type": "json",
    "bodyPath": [
      "Contact",
      "ContactGroups"
    ]
  },
  {
    "key": "contact_website",
    "type": "text",
    "bodyPath": [
      "Contact",
      "Website"
    ]
  },
  {
    "key": "contact_branding_theme_branding_theme_id",
    "type": "text",
    "bodyPath": [
      "Contact",
      "BrandingTheme",
      "BrandingThemeID"
    ]
  },
  {
    "key": "contact_branding_theme_name",
    "type": "text",
    "bodyPath": [
      "Contact",
      "BrandingTheme",
      "Name"
    ]
  },
  {
    "key": "contact_branding_theme_logo_url",
    "type": "text",
    "bodyPath": [
      "Contact",
      "BrandingTheme",
      "LogoUrl"
    ]
  },
  {
    "key": "contact_branding_theme_type",
    "type": "text",
    "bodyPath": [
      "Contact",
      "BrandingTheme",
      "Type"
    ]
  },
  {
    "key": "contact_branding_theme_sort_order",
    "type": "number",
    "bodyPath": [
      "Contact",
      "BrandingTheme",
      "SortOrder"
    ]
  },
  {
    "key": "contact_branding_theme_created_date_utc",
    "type": "text",
    "bodyPath": [
      "Contact",
      "BrandingTheme",
      "CreatedDateUTC"
    ]
  },
  {
    "key": "contact_batch_payments_bank_account_number",
    "type": "text",
    "bodyPath": [
      "Contact",
      "BatchPayments",
      "BankAccountNumber"
    ]
  },
  {
    "key": "contact_batch_payments_bank_account_name",
    "type": "text",
    "bodyPath": [
      "Contact",
      "BatchPayments",
      "BankAccountName"
    ]
  },
  {
    "key": "contact_batch_payments_details",
    "type": "text",
    "bodyPath": [
      "Contact",
      "BatchPayments",
      "Details"
    ]
  },
  {
    "key": "contact_batch_payments_code",
    "type": "text",
    "bodyPath": [
      "Contact",
      "BatchPayments",
      "Code"
    ]
  },
  {
    "key": "contact_batch_payments_reference",
    "type": "text",
    "bodyPath": [
      "Contact",
      "BatchPayments",
      "Reference"
    ]
  },
  {
    "key": "contact_discount",
    "type": "number",
    "bodyPath": [
      "Contact",
      "Discount"
    ]
  },
  {
    "key": "contact_balances_accounts_receivable_outstanding",
    "type": "number",
    "bodyPath": [
      "Contact",
      "Balances",
      "AccountsReceivable",
      "Outstanding"
    ]
  },
  {
    "key": "contact_balances_accounts_receivable_overdue",
    "type": "number",
    "bodyPath": [
      "Contact",
      "Balances",
      "AccountsReceivable",
      "Overdue"
    ]
  },
  {
    "key": "contact_balances_accounts_payable_outstanding",
    "type": "number",
    "bodyPath": [
      "Contact",
      "Balances",
      "AccountsPayable",
      "Outstanding"
    ]
  },
  {
    "key": "contact_balances_accounts_payable_overdue",
    "type": "number",
    "bodyPath": [
      "Contact",
      "Balances",
      "AccountsPayable",
      "Overdue"
    ]
  },
  {
    "key": "contact_attachments",
    "type": "json",
    "bodyPath": [
      "Contact",
      "Attachments"
    ]
  },
  {
    "key": "contact_has_attachments",
    "type": "checkbox",
    "bodyPath": [
      "Contact",
      "HasAttachments"
    ]
  },
  {
    "key": "contact_validation_errors",
    "type": "json",
    "bodyPath": [
      "Contact",
      "ValidationErrors"
    ]
  },
  {
    "key": "contact_has_validation_errors",
    "type": "checkbox",
    "bodyPath": [
      "Contact",
      "HasValidationErrors"
    ]
  },
  {
    "key": "contact_status_attribute_string",
    "type": "text",
    "bodyPath": [
      "Contact",
      "StatusAttributeString"
    ]
  },
  {
    "key": "line_items",
    "type": "json",
    "bodyPath": [
      "LineItems"
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
    "key": "date_string",
    "type": "text",
    "bodyPath": [
      "DateString"
    ]
  },
  {
    "key": "expiry_date",
    "type": "text",
    "bodyPath": [
      "ExpiryDate"
    ]
  },
  {
    "key": "expiry_date_string",
    "type": "text",
    "bodyPath": [
      "ExpiryDateString"
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
    "key": "currency_code",
    "type": "text",
    "bodyPath": [
      "CurrencyCode"
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
    "key": "sub_total",
    "type": "number",
    "bodyPath": [
      "SubTotal"
    ]
  },
  {
    "key": "total_tax",
    "type": "number",
    "bodyPath": [
      "TotalTax"
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
    "key": "total_discount",
    "type": "number",
    "bodyPath": [
      "TotalDiscount"
    ]
  },
  {
    "key": "title",
    "type": "text",
    "bodyPath": [
      "Title"
    ]
  },
  {
    "key": "summary",
    "type": "text",
    "bodyPath": [
      "Summary"
    ]
  },
  {
    "key": "branding_theme_id",
    "type": "text",
    "bodyPath": [
      "BrandingThemeID"
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
    "key": "line_amount_types",
    "type": "text",
    "bodyPath": [
      "LineAmountTypes"
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
    "key": "validation_errors",
    "type": "json",
    "bodyPath": [
      "ValidationErrors"
    ]
  }
];


module.exports = {
  async xero_quote_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/Quotes";
    

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
