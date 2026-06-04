const { utils } = require('./utils');

const BODY_FIELDS = [
  {
    "key": "invoice_type",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Type"
    ]
  },
  {
    "key": "invoice_contact_contact_id",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "ContactID"
    ]
  },
  {
    "key": "invoice_contact_merged_to_contact_id",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "MergedToContactID"
    ]
  },
  {
    "key": "invoice_contact_contact_number",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "ContactNumber"
    ]
  },
  {
    "key": "invoice_contact_account_number",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "AccountNumber"
    ]
  },
  {
    "key": "invoice_contact_contact_status",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "ContactStatus"
    ]
  },
  {
    "key": "invoice_contact_name",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "Name"
    ]
  },
  {
    "key": "invoice_contact_first_name",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "FirstName"
    ]
  },
  {
    "key": "invoice_contact_last_name",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "LastName"
    ]
  },
  {
    "key": "invoice_contact_company_number",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "CompanyNumber"
    ]
  },
  {
    "key": "invoice_contact_email_address",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "EmailAddress"
    ]
  },
  {
    "key": "invoice_contact_contact_persons",
    "type": "json",
    "bodyPath": [
      "Invoice",
      "Contact",
      "ContactPersons"
    ]
  },
  {
    "key": "invoice_contact_bank_account_details",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "BankAccountDetails"
    ]
  },
  {
    "key": "invoice_contact_tax_number",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "TaxNumber"
    ]
  },
  {
    "key": "invoice_contact_tax_number_type",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "TaxNumberType"
    ]
  },
  {
    "key": "invoice_contact_accounts_receivable_tax_type",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "AccountsReceivableTaxType"
    ]
  },
  {
    "key": "invoice_contact_accounts_payable_tax_type",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "AccountsPayableTaxType"
    ]
  },
  {
    "key": "invoice_contact_addresses",
    "type": "json",
    "bodyPath": [
      "Invoice",
      "Contact",
      "Addresses"
    ]
  },
  {
    "key": "invoice_contact_phones",
    "type": "json",
    "bodyPath": [
      "Invoice",
      "Contact",
      "Phones"
    ]
  },
  {
    "key": "invoice_contact_is_supplier",
    "type": "checkbox",
    "bodyPath": [
      "Invoice",
      "Contact",
      "IsSupplier"
    ]
  },
  {
    "key": "invoice_contact_is_customer",
    "type": "checkbox",
    "bodyPath": [
      "Invoice",
      "Contact",
      "IsCustomer"
    ]
  },
  {
    "key": "invoice_contact_sales_default_line_amount_type",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "SalesDefaultLineAmountType"
    ]
  },
  {
    "key": "invoice_contact_purchases_default_line_amount_type",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "PurchasesDefaultLineAmountType"
    ]
  },
  {
    "key": "invoice_contact_default_currency",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "DefaultCurrency"
    ]
  },
  {
    "key": "invoice_contact_xero_network_key",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "XeroNetworkKey"
    ]
  },
  {
    "key": "invoice_contact_sales_default_account_code",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "SalesDefaultAccountCode"
    ]
  },
  {
    "key": "invoice_contact_purchases_default_account_code",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "PurchasesDefaultAccountCode"
    ]
  },
  {
    "key": "invoice_contact_sales_tracking_categories",
    "type": "json",
    "bodyPath": [
      "Invoice",
      "Contact",
      "SalesTrackingCategories"
    ]
  },
  {
    "key": "invoice_contact_purchases_tracking_categories",
    "type": "json",
    "bodyPath": [
      "Invoice",
      "Contact",
      "PurchasesTrackingCategories"
    ]
  },
  {
    "key": "invoice_contact_tracking_category_name",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "TrackingCategoryName"
    ]
  },
  {
    "key": "invoice_contact_tracking_category_option",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "TrackingCategoryOption"
    ]
  },
  {
    "key": "invoice_contact_payment_terms_bills_day",
    "type": "number",
    "bodyPath": [
      "Invoice",
      "Contact",
      "PaymentTerms",
      "Bills",
      "Day"
    ]
  },
  {
    "key": "invoice_contact_payment_terms_bills_type",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "PaymentTerms",
      "Bills",
      "Type"
    ]
  },
  {
    "key": "invoice_contact_payment_terms_sales_day",
    "type": "number",
    "bodyPath": [
      "Invoice",
      "Contact",
      "PaymentTerms",
      "Sales",
      "Day"
    ]
  },
  {
    "key": "invoice_contact_payment_terms_sales_type",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "PaymentTerms",
      "Sales",
      "Type"
    ]
  },
  {
    "key": "invoice_contact_updated_date_utc",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "UpdatedDateUTC"
    ]
  },
  {
    "key": "invoice_contact_contact_groups",
    "type": "json",
    "bodyPath": [
      "Invoice",
      "Contact",
      "ContactGroups"
    ]
  },
  {
    "key": "invoice_contact_website",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "Website"
    ]
  },
  {
    "key": "invoice_contact_branding_theme_branding_theme_id",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "BrandingTheme",
      "BrandingThemeID"
    ]
  },
  {
    "key": "invoice_contact_branding_theme_name",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "BrandingTheme",
      "Name"
    ]
  },
  {
    "key": "invoice_contact_branding_theme_logo_url",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "BrandingTheme",
      "LogoUrl"
    ]
  },
  {
    "key": "invoice_contact_branding_theme_type",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "BrandingTheme",
      "Type"
    ]
  },
  {
    "key": "invoice_contact_branding_theme_sort_order",
    "type": "number",
    "bodyPath": [
      "Invoice",
      "Contact",
      "BrandingTheme",
      "SortOrder"
    ]
  },
  {
    "key": "invoice_contact_branding_theme_created_date_utc",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "BrandingTheme",
      "CreatedDateUTC"
    ]
  },
  {
    "key": "invoice_contact_batch_payments_bank_account_number",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "BatchPayments",
      "BankAccountNumber"
    ]
  },
  {
    "key": "invoice_contact_batch_payments_bank_account_name",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "BatchPayments",
      "BankAccountName"
    ]
  },
  {
    "key": "invoice_contact_batch_payments_details",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "BatchPayments",
      "Details"
    ]
  },
  {
    "key": "invoice_contact_batch_payments_code",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "BatchPayments",
      "Code"
    ]
  },
  {
    "key": "invoice_contact_batch_payments_reference",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "BatchPayments",
      "Reference"
    ]
  },
  {
    "key": "invoice_contact_discount",
    "type": "number",
    "bodyPath": [
      "Invoice",
      "Contact",
      "Discount"
    ]
  },
  {
    "key": "invoice_contact_balances_accounts_receivable_outstanding",
    "type": "number",
    "bodyPath": [
      "Invoice",
      "Contact",
      "Balances",
      "AccountsReceivable",
      "Outstanding"
    ]
  },
  {
    "key": "invoice_contact_balances_accounts_receivable_overdue",
    "type": "number",
    "bodyPath": [
      "Invoice",
      "Contact",
      "Balances",
      "AccountsReceivable",
      "Overdue"
    ]
  },
  {
    "key": "invoice_contact_balances_accounts_payable_outstanding",
    "type": "number",
    "bodyPath": [
      "Invoice",
      "Contact",
      "Balances",
      "AccountsPayable",
      "Outstanding"
    ]
  },
  {
    "key": "invoice_contact_balances_accounts_payable_overdue",
    "type": "number",
    "bodyPath": [
      "Invoice",
      "Contact",
      "Balances",
      "AccountsPayable",
      "Overdue"
    ]
  },
  {
    "key": "invoice_contact_attachments",
    "type": "json",
    "bodyPath": [
      "Invoice",
      "Contact",
      "Attachments"
    ]
  },
  {
    "key": "invoice_contact_has_attachments",
    "type": "checkbox",
    "bodyPath": [
      "Invoice",
      "Contact",
      "HasAttachments"
    ]
  },
  {
    "key": "invoice_contact_validation_errors",
    "type": "json",
    "bodyPath": [
      "Invoice",
      "Contact",
      "ValidationErrors"
    ]
  },
  {
    "key": "invoice_contact_has_validation_errors",
    "type": "checkbox",
    "bodyPath": [
      "Invoice",
      "Contact",
      "HasValidationErrors"
    ]
  },
  {
    "key": "invoice_contact_status_attribute_string",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Contact",
      "StatusAttributeString"
    ]
  },
  {
    "key": "invoice_line_items",
    "type": "json",
    "bodyPath": [
      "Invoice",
      "LineItems"
    ]
  },
  {
    "key": "invoice_date",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Date"
    ]
  },
  {
    "key": "invoice_due_date",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "DueDate"
    ]
  },
  {
    "key": "invoice_line_amount_types",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "LineAmountTypes"
    ]
  },
  {
    "key": "invoice_invoice_number",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "InvoiceNumber"
    ]
  },
  {
    "key": "invoice_reference",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Reference"
    ]
  },
  {
    "key": "invoice_branding_theme_id",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "BrandingThemeID"
    ]
  },
  {
    "key": "invoice_url",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Url"
    ]
  },
  {
    "key": "invoice_currency_code",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "CurrencyCode"
    ]
  },
  {
    "key": "invoice_currency_rate",
    "type": "number",
    "bodyPath": [
      "Invoice",
      "CurrencyRate"
    ]
  },
  {
    "key": "invoice_status",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "Status"
    ]
  },
  {
    "key": "invoice_sent_to_contact",
    "type": "checkbox",
    "bodyPath": [
      "Invoice",
      "SentToContact"
    ]
  },
  {
    "key": "invoice_expected_payment_date",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "ExpectedPaymentDate"
    ]
  },
  {
    "key": "invoice_planned_payment_date",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "PlannedPaymentDate"
    ]
  },
  {
    "key": "invoice_cisdeduction",
    "type": "number",
    "bodyPath": [
      "Invoice",
      "CISDeduction"
    ]
  },
  {
    "key": "invoice_cisrate",
    "type": "number",
    "bodyPath": [
      "Invoice",
      "CISRate"
    ]
  },
  {
    "key": "invoice_sub_total",
    "type": "number",
    "bodyPath": [
      "Invoice",
      "SubTotal"
    ]
  },
  {
    "key": "invoice_total_tax",
    "type": "number",
    "bodyPath": [
      "Invoice",
      "TotalTax"
    ]
  },
  {
    "key": "invoice_total",
    "type": "number",
    "bodyPath": [
      "Invoice",
      "Total"
    ]
  },
  {
    "key": "invoice_total_discount",
    "type": "number",
    "bodyPath": [
      "Invoice",
      "TotalDiscount"
    ]
  },
  {
    "key": "invoice_invoice_id",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "InvoiceID"
    ]
  },
  {
    "key": "invoice_repeating_invoice_id",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "RepeatingInvoiceID"
    ]
  },
  {
    "key": "invoice_has_attachments",
    "type": "checkbox",
    "bodyPath": [
      "Invoice",
      "HasAttachments"
    ]
  },
  {
    "key": "invoice_is_discounted",
    "type": "checkbox",
    "bodyPath": [
      "Invoice",
      "IsDiscounted"
    ]
  },
  {
    "key": "invoice_payments",
    "type": "json",
    "bodyPath": [
      "Invoice",
      "Payments"
    ]
  },
  {
    "key": "invoice_prepayments",
    "type": "json",
    "bodyPath": [
      "Invoice",
      "Prepayments"
    ]
  },
  {
    "key": "invoice_overpayments",
    "type": "json",
    "bodyPath": [
      "Invoice",
      "Overpayments"
    ]
  },
  {
    "key": "invoice_amount_due",
    "type": "number",
    "bodyPath": [
      "Invoice",
      "AmountDue"
    ]
  },
  {
    "key": "invoice_amount_paid",
    "type": "number",
    "bodyPath": [
      "Invoice",
      "AmountPaid"
    ]
  },
  {
    "key": "invoice_fully_paid_on_date",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "FullyPaidOnDate"
    ]
  },
  {
    "key": "invoice_amount_credited",
    "type": "number",
    "bodyPath": [
      "Invoice",
      "AmountCredited"
    ]
  },
  {
    "key": "invoice_updated_date_utc",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "UpdatedDateUTC"
    ]
  },
  {
    "key": "invoice_credit_notes",
    "type": "json",
    "bodyPath": [
      "Invoice",
      "CreditNotes"
    ]
  },
  {
    "key": "invoice_attachments",
    "type": "json",
    "bodyPath": [
      "Invoice",
      "Attachments"
    ]
  },
  {
    "key": "invoice_has_errors",
    "type": "checkbox",
    "bodyPath": [
      "Invoice",
      "HasErrors"
    ]
  },
  {
    "key": "invoice_status_attribute_string",
    "type": "text",
    "bodyPath": [
      "Invoice",
      "StatusAttributeString"
    ]
  },
  {
    "key": "invoice_validation_errors",
    "type": "json",
    "bodyPath": [
      "Invoice",
      "ValidationErrors"
    ]
  },
  {
    "key": "invoice_warnings",
    "type": "json",
    "bodyPath": [
      "Invoice",
      "Warnings"
    ]
  },
  {
    "key": "invoice_invoice_addresses",
    "type": "json",
    "bodyPath": [
      "Invoice",
      "InvoiceAddresses"
    ]
  },
  {
    "key": "credit_note_type",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Type"
    ]
  },
  {
    "key": "credit_note_contact_contact_id",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "ContactID"
    ]
  },
  {
    "key": "credit_note_contact_merged_to_contact_id",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "MergedToContactID"
    ]
  },
  {
    "key": "credit_note_contact_contact_number",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "ContactNumber"
    ]
  },
  {
    "key": "credit_note_contact_account_number",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "AccountNumber"
    ]
  },
  {
    "key": "credit_note_contact_contact_status",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "ContactStatus"
    ]
  },
  {
    "key": "credit_note_contact_name",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "Name"
    ]
  },
  {
    "key": "credit_note_contact_first_name",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "FirstName"
    ]
  },
  {
    "key": "credit_note_contact_last_name",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "LastName"
    ]
  },
  {
    "key": "credit_note_contact_company_number",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "CompanyNumber"
    ]
  },
  {
    "key": "credit_note_contact_email_address",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "EmailAddress"
    ]
  },
  {
    "key": "credit_note_contact_contact_persons",
    "type": "json",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "ContactPersons"
    ]
  },
  {
    "key": "credit_note_contact_bank_account_details",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "BankAccountDetails"
    ]
  },
  {
    "key": "credit_note_contact_tax_number",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "TaxNumber"
    ]
  },
  {
    "key": "credit_note_contact_tax_number_type",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "TaxNumberType"
    ]
  },
  {
    "key": "credit_note_contact_accounts_receivable_tax_type",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "AccountsReceivableTaxType"
    ]
  },
  {
    "key": "credit_note_contact_accounts_payable_tax_type",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "AccountsPayableTaxType"
    ]
  },
  {
    "key": "credit_note_contact_addresses",
    "type": "json",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "Addresses"
    ]
  },
  {
    "key": "credit_note_contact_phones",
    "type": "json",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "Phones"
    ]
  },
  {
    "key": "credit_note_contact_is_supplier",
    "type": "checkbox",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "IsSupplier"
    ]
  },
  {
    "key": "credit_note_contact_is_customer",
    "type": "checkbox",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "IsCustomer"
    ]
  },
  {
    "key": "credit_note_contact_sales_default_line_amount_type",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "SalesDefaultLineAmountType"
    ]
  },
  {
    "key": "credit_note_contact_purchases_default_line_amount_type",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "PurchasesDefaultLineAmountType"
    ]
  },
  {
    "key": "credit_note_contact_default_currency",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "DefaultCurrency"
    ]
  },
  {
    "key": "credit_note_contact_xero_network_key",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "XeroNetworkKey"
    ]
  },
  {
    "key": "credit_note_contact_sales_default_account_code",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "SalesDefaultAccountCode"
    ]
  },
  {
    "key": "credit_note_contact_purchases_default_account_code",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "PurchasesDefaultAccountCode"
    ]
  },
  {
    "key": "credit_note_contact_sales_tracking_categories",
    "type": "json",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "SalesTrackingCategories"
    ]
  },
  {
    "key": "credit_note_contact_purchases_tracking_categories",
    "type": "json",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "PurchasesTrackingCategories"
    ]
  },
  {
    "key": "credit_note_contact_tracking_category_name",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "TrackingCategoryName"
    ]
  },
  {
    "key": "credit_note_contact_tracking_category_option",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "TrackingCategoryOption"
    ]
  },
  {
    "key": "credit_note_contact_payment_terms_bills_day",
    "type": "number",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "PaymentTerms",
      "Bills",
      "Day"
    ]
  },
  {
    "key": "credit_note_contact_payment_terms_bills_type",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "PaymentTerms",
      "Bills",
      "Type"
    ]
  },
  {
    "key": "credit_note_contact_payment_terms_sales_day",
    "type": "number",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "PaymentTerms",
      "Sales",
      "Day"
    ]
  },
  {
    "key": "credit_note_contact_payment_terms_sales_type",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "PaymentTerms",
      "Sales",
      "Type"
    ]
  },
  {
    "key": "credit_note_contact_updated_date_utc",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "UpdatedDateUTC"
    ]
  },
  {
    "key": "credit_note_contact_contact_groups",
    "type": "json",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "ContactGroups"
    ]
  },
  {
    "key": "credit_note_contact_website",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "Website"
    ]
  },
  {
    "key": "credit_note_contact_branding_theme_branding_theme_id",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "BrandingTheme",
      "BrandingThemeID"
    ]
  },
  {
    "key": "credit_note_contact_branding_theme_name",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "BrandingTheme",
      "Name"
    ]
  },
  {
    "key": "credit_note_contact_branding_theme_logo_url",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "BrandingTheme",
      "LogoUrl"
    ]
  },
  {
    "key": "credit_note_contact_branding_theme_type",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "BrandingTheme",
      "Type"
    ]
  },
  {
    "key": "credit_note_contact_branding_theme_sort_order",
    "type": "number",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "BrandingTheme",
      "SortOrder"
    ]
  },
  {
    "key": "credit_note_contact_branding_theme_created_date_utc",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "BrandingTheme",
      "CreatedDateUTC"
    ]
  },
  {
    "key": "credit_note_contact_batch_payments_bank_account_number",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "BatchPayments",
      "BankAccountNumber"
    ]
  },
  {
    "key": "credit_note_contact_batch_payments_bank_account_name",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "BatchPayments",
      "BankAccountName"
    ]
  },
  {
    "key": "credit_note_contact_batch_payments_details",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "BatchPayments",
      "Details"
    ]
  },
  {
    "key": "credit_note_contact_batch_payments_code",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "BatchPayments",
      "Code"
    ]
  },
  {
    "key": "credit_note_contact_batch_payments_reference",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "BatchPayments",
      "Reference"
    ]
  },
  {
    "key": "credit_note_contact_discount",
    "type": "number",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "Discount"
    ]
  },
  {
    "key": "credit_note_contact_balances_accounts_receivable_outstanding",
    "type": "number",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "Balances",
      "AccountsReceivable",
      "Outstanding"
    ]
  },
  {
    "key": "credit_note_contact_balances_accounts_receivable_overdue",
    "type": "number",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "Balances",
      "AccountsReceivable",
      "Overdue"
    ]
  },
  {
    "key": "credit_note_contact_balances_accounts_payable_outstanding",
    "type": "number",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "Balances",
      "AccountsPayable",
      "Outstanding"
    ]
  },
  {
    "key": "credit_note_contact_balances_accounts_payable_overdue",
    "type": "number",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "Balances",
      "AccountsPayable",
      "Overdue"
    ]
  },
  {
    "key": "credit_note_contact_attachments",
    "type": "json",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "Attachments"
    ]
  },
  {
    "key": "credit_note_contact_has_attachments",
    "type": "checkbox",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "HasAttachments"
    ]
  },
  {
    "key": "credit_note_contact_validation_errors",
    "type": "json",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "ValidationErrors"
    ]
  },
  {
    "key": "credit_note_contact_has_validation_errors",
    "type": "checkbox",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "HasValidationErrors"
    ]
  },
  {
    "key": "credit_note_contact_status_attribute_string",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Contact",
      "StatusAttributeString"
    ]
  },
  {
    "key": "credit_note_date",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Date"
    ]
  },
  {
    "key": "credit_note_due_date",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "DueDate"
    ]
  },
  {
    "key": "credit_note_status",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Status"
    ]
  },
  {
    "key": "credit_note_line_amount_types",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "LineAmountTypes"
    ]
  },
  {
    "key": "credit_note_line_items",
    "type": "json",
    "bodyPath": [
      "CreditNote",
      "LineItems"
    ]
  },
  {
    "key": "credit_note_sub_total",
    "type": "number",
    "bodyPath": [
      "CreditNote",
      "SubTotal"
    ]
  },
  {
    "key": "credit_note_total_tax",
    "type": "number",
    "bodyPath": [
      "CreditNote",
      "TotalTax"
    ]
  },
  {
    "key": "credit_note_total",
    "type": "number",
    "bodyPath": [
      "CreditNote",
      "Total"
    ]
  },
  {
    "key": "credit_note_cisdeduction",
    "type": "number",
    "bodyPath": [
      "CreditNote",
      "CISDeduction"
    ]
  },
  {
    "key": "credit_note_cisrate",
    "type": "number",
    "bodyPath": [
      "CreditNote",
      "CISRate"
    ]
  },
  {
    "key": "credit_note_updated_date_utc",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "UpdatedDateUTC"
    ]
  },
  {
    "key": "credit_note_currency_code",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "CurrencyCode"
    ]
  },
  {
    "key": "credit_note_fully_paid_on_date",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "FullyPaidOnDate"
    ]
  },
  {
    "key": "credit_note_credit_note_id",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "CreditNoteID"
    ]
  },
  {
    "key": "credit_note_credit_note_number",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "CreditNoteNumber"
    ]
  },
  {
    "key": "credit_note_reference",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "Reference"
    ]
  },
  {
    "key": "credit_note_sent_to_contact",
    "type": "checkbox",
    "bodyPath": [
      "CreditNote",
      "SentToContact"
    ]
  },
  {
    "key": "credit_note_currency_rate",
    "type": "number",
    "bodyPath": [
      "CreditNote",
      "CurrencyRate"
    ]
  },
  {
    "key": "credit_note_remaining_credit",
    "type": "number",
    "bodyPath": [
      "CreditNote",
      "RemainingCredit"
    ]
  },
  {
    "key": "credit_note_allocations",
    "type": "json",
    "bodyPath": [
      "CreditNote",
      "Allocations"
    ]
  },
  {
    "key": "credit_note_applied_amount",
    "type": "number",
    "bodyPath": [
      "CreditNote",
      "AppliedAmount"
    ]
  },
  {
    "key": "credit_note_payments",
    "type": "json",
    "bodyPath": [
      "CreditNote",
      "Payments"
    ]
  },
  {
    "key": "credit_note_branding_theme_id",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "BrandingThemeID"
    ]
  },
  {
    "key": "credit_note_status_attribute_string",
    "type": "text",
    "bodyPath": [
      "CreditNote",
      "StatusAttributeString"
    ]
  },
  {
    "key": "credit_note_has_attachments",
    "type": "checkbox",
    "bodyPath": [
      "CreditNote",
      "HasAttachments"
    ]
  },
  {
    "key": "credit_note_has_errors",
    "type": "checkbox",
    "bodyPath": [
      "CreditNote",
      "HasErrors"
    ]
  },
  {
    "key": "credit_note_validation_errors",
    "type": "json",
    "bodyPath": [
      "CreditNote",
      "ValidationErrors"
    ]
  },
  {
    "key": "credit_note_warnings",
    "type": "json",
    "bodyPath": [
      "CreditNote",
      "Warnings"
    ]
  },
  {
    "key": "credit_note_invoice_addresses",
    "type": "json",
    "bodyPath": [
      "CreditNote",
      "InvoiceAddresses"
    ]
  },
  {
    "key": "prepayment_type",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Type"
    ]
  },
  {
    "key": "prepayment_contact_contact_id",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "ContactID"
    ]
  },
  {
    "key": "prepayment_contact_merged_to_contact_id",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "MergedToContactID"
    ]
  },
  {
    "key": "prepayment_contact_contact_number",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "ContactNumber"
    ]
  },
  {
    "key": "prepayment_contact_account_number",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "AccountNumber"
    ]
  },
  {
    "key": "prepayment_contact_contact_status",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "ContactStatus"
    ]
  },
  {
    "key": "prepayment_contact_name",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "Name"
    ]
  },
  {
    "key": "prepayment_contact_first_name",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "FirstName"
    ]
  },
  {
    "key": "prepayment_contact_last_name",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "LastName"
    ]
  },
  {
    "key": "prepayment_contact_company_number",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "CompanyNumber"
    ]
  },
  {
    "key": "prepayment_contact_email_address",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "EmailAddress"
    ]
  },
  {
    "key": "prepayment_contact_contact_persons",
    "type": "json",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "ContactPersons"
    ]
  },
  {
    "key": "prepayment_contact_bank_account_details",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "BankAccountDetails"
    ]
  },
  {
    "key": "prepayment_contact_tax_number",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "TaxNumber"
    ]
  },
  {
    "key": "prepayment_contact_tax_number_type",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "TaxNumberType"
    ]
  },
  {
    "key": "prepayment_contact_accounts_receivable_tax_type",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "AccountsReceivableTaxType"
    ]
  },
  {
    "key": "prepayment_contact_accounts_payable_tax_type",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "AccountsPayableTaxType"
    ]
  },
  {
    "key": "prepayment_contact_addresses",
    "type": "json",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "Addresses"
    ]
  },
  {
    "key": "prepayment_contact_phones",
    "type": "json",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "Phones"
    ]
  },
  {
    "key": "prepayment_contact_is_supplier",
    "type": "checkbox",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "IsSupplier"
    ]
  },
  {
    "key": "prepayment_contact_is_customer",
    "type": "checkbox",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "IsCustomer"
    ]
  },
  {
    "key": "prepayment_contact_sales_default_line_amount_type",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "SalesDefaultLineAmountType"
    ]
  },
  {
    "key": "prepayment_contact_purchases_default_line_amount_type",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "PurchasesDefaultLineAmountType"
    ]
  },
  {
    "key": "prepayment_contact_default_currency",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "DefaultCurrency"
    ]
  },
  {
    "key": "prepayment_contact_xero_network_key",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "XeroNetworkKey"
    ]
  },
  {
    "key": "prepayment_contact_sales_default_account_code",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "SalesDefaultAccountCode"
    ]
  },
  {
    "key": "prepayment_contact_purchases_default_account_code",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "PurchasesDefaultAccountCode"
    ]
  },
  {
    "key": "prepayment_contact_sales_tracking_categories",
    "type": "json",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "SalesTrackingCategories"
    ]
  },
  {
    "key": "prepayment_contact_purchases_tracking_categories",
    "type": "json",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "PurchasesTrackingCategories"
    ]
  },
  {
    "key": "prepayment_contact_tracking_category_name",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "TrackingCategoryName"
    ]
  },
  {
    "key": "prepayment_contact_tracking_category_option",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "TrackingCategoryOption"
    ]
  },
  {
    "key": "prepayment_contact_payment_terms_bills_day",
    "type": "number",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "PaymentTerms",
      "Bills",
      "Day"
    ]
  },
  {
    "key": "prepayment_contact_payment_terms_bills_type",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "PaymentTerms",
      "Bills",
      "Type"
    ]
  },
  {
    "key": "prepayment_contact_payment_terms_sales_day",
    "type": "number",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "PaymentTerms",
      "Sales",
      "Day"
    ]
  },
  {
    "key": "prepayment_contact_payment_terms_sales_type",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "PaymentTerms",
      "Sales",
      "Type"
    ]
  },
  {
    "key": "prepayment_contact_updated_date_utc",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "UpdatedDateUTC"
    ]
  },
  {
    "key": "prepayment_contact_contact_groups",
    "type": "json",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "ContactGroups"
    ]
  },
  {
    "key": "prepayment_contact_website",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "Website"
    ]
  },
  {
    "key": "prepayment_contact_branding_theme_branding_theme_id",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "BrandingTheme",
      "BrandingThemeID"
    ]
  },
  {
    "key": "prepayment_contact_branding_theme_name",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "BrandingTheme",
      "Name"
    ]
  },
  {
    "key": "prepayment_contact_branding_theme_logo_url",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "BrandingTheme",
      "LogoUrl"
    ]
  },
  {
    "key": "prepayment_contact_branding_theme_type",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "BrandingTheme",
      "Type"
    ]
  },
  {
    "key": "prepayment_contact_branding_theme_sort_order",
    "type": "number",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "BrandingTheme",
      "SortOrder"
    ]
  },
  {
    "key": "prepayment_contact_branding_theme_created_date_utc",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "BrandingTheme",
      "CreatedDateUTC"
    ]
  },
  {
    "key": "prepayment_contact_batch_payments_bank_account_number",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "BatchPayments",
      "BankAccountNumber"
    ]
  },
  {
    "key": "prepayment_contact_batch_payments_bank_account_name",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "BatchPayments",
      "BankAccountName"
    ]
  },
  {
    "key": "prepayment_contact_batch_payments_details",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "BatchPayments",
      "Details"
    ]
  },
  {
    "key": "prepayment_contact_batch_payments_code",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "BatchPayments",
      "Code"
    ]
  },
  {
    "key": "prepayment_contact_batch_payments_reference",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "BatchPayments",
      "Reference"
    ]
  },
  {
    "key": "prepayment_contact_discount",
    "type": "number",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "Discount"
    ]
  },
  {
    "key": "prepayment_contact_balances_accounts_receivable_outstanding",
    "type": "number",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "Balances",
      "AccountsReceivable",
      "Outstanding"
    ]
  },
  {
    "key": "prepayment_contact_balances_accounts_receivable_overdue",
    "type": "number",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "Balances",
      "AccountsReceivable",
      "Overdue"
    ]
  },
  {
    "key": "prepayment_contact_balances_accounts_payable_outstanding",
    "type": "number",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "Balances",
      "AccountsPayable",
      "Outstanding"
    ]
  },
  {
    "key": "prepayment_contact_balances_accounts_payable_overdue",
    "type": "number",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "Balances",
      "AccountsPayable",
      "Overdue"
    ]
  },
  {
    "key": "prepayment_contact_attachments",
    "type": "json",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "Attachments"
    ]
  },
  {
    "key": "prepayment_contact_has_attachments",
    "type": "checkbox",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "HasAttachments"
    ]
  },
  {
    "key": "prepayment_contact_validation_errors",
    "type": "json",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "ValidationErrors"
    ]
  },
  {
    "key": "prepayment_contact_has_validation_errors",
    "type": "checkbox",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "HasValidationErrors"
    ]
  },
  {
    "key": "prepayment_contact_status_attribute_string",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Contact",
      "StatusAttributeString"
    ]
  },
  {
    "key": "prepayment_date",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Date"
    ]
  },
  {
    "key": "prepayment_status",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Status"
    ]
  },
  {
    "key": "prepayment_line_amount_types",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "LineAmountTypes"
    ]
  },
  {
    "key": "prepayment_line_items",
    "type": "json",
    "bodyPath": [
      "Prepayment",
      "LineItems"
    ]
  },
  {
    "key": "prepayment_sub_total",
    "type": "number",
    "bodyPath": [
      "Prepayment",
      "SubTotal"
    ]
  },
  {
    "key": "prepayment_total_tax",
    "type": "number",
    "bodyPath": [
      "Prepayment",
      "TotalTax"
    ]
  },
  {
    "key": "prepayment_total",
    "type": "number",
    "bodyPath": [
      "Prepayment",
      "Total"
    ]
  },
  {
    "key": "prepayment_reference",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "Reference"
    ]
  },
  {
    "key": "prepayment_invoice_number",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "InvoiceNumber"
    ]
  },
  {
    "key": "prepayment_updated_date_utc",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "UpdatedDateUTC"
    ]
  },
  {
    "key": "prepayment_currency_code",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "CurrencyCode"
    ]
  },
  {
    "key": "prepayment_prepayment_id",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "PrepaymentID"
    ]
  },
  {
    "key": "prepayment_branding_theme_id",
    "type": "text",
    "bodyPath": [
      "Prepayment",
      "BrandingThemeID"
    ]
  },
  {
    "key": "prepayment_currency_rate",
    "type": "number",
    "bodyPath": [
      "Prepayment",
      "CurrencyRate"
    ]
  },
  {
    "key": "prepayment_remaining_credit",
    "type": "number",
    "bodyPath": [
      "Prepayment",
      "RemainingCredit"
    ]
  },
  {
    "key": "prepayment_allocations",
    "type": "json",
    "bodyPath": [
      "Prepayment",
      "Allocations"
    ]
  },
  {
    "key": "prepayment_payments",
    "type": "json",
    "bodyPath": [
      "Prepayment",
      "Payments"
    ]
  },
  {
    "key": "prepayment_applied_amount",
    "type": "number",
    "bodyPath": [
      "Prepayment",
      "AppliedAmount"
    ]
  },
  {
    "key": "prepayment_has_attachments",
    "type": "checkbox",
    "bodyPath": [
      "Prepayment",
      "HasAttachments"
    ]
  },
  {
    "key": "prepayment_attachments",
    "type": "json",
    "bodyPath": [
      "Prepayment",
      "Attachments"
    ]
  },
  {
    "key": "overpayment_type",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Type"
    ]
  },
  {
    "key": "overpayment_contact_contact_id",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "ContactID"
    ]
  },
  {
    "key": "overpayment_contact_merged_to_contact_id",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "MergedToContactID"
    ]
  },
  {
    "key": "overpayment_contact_contact_number",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "ContactNumber"
    ]
  },
  {
    "key": "overpayment_contact_account_number",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "AccountNumber"
    ]
  },
  {
    "key": "overpayment_contact_contact_status",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "ContactStatus"
    ]
  },
  {
    "key": "overpayment_contact_name",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "Name"
    ]
  },
  {
    "key": "overpayment_contact_first_name",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "FirstName"
    ]
  },
  {
    "key": "overpayment_contact_last_name",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "LastName"
    ]
  },
  {
    "key": "overpayment_contact_company_number",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "CompanyNumber"
    ]
  },
  {
    "key": "overpayment_contact_email_address",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "EmailAddress"
    ]
  },
  {
    "key": "overpayment_contact_contact_persons",
    "type": "json",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "ContactPersons"
    ]
  },
  {
    "key": "overpayment_contact_bank_account_details",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "BankAccountDetails"
    ]
  },
  {
    "key": "overpayment_contact_tax_number",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "TaxNumber"
    ]
  },
  {
    "key": "overpayment_contact_tax_number_type",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "TaxNumberType"
    ]
  },
  {
    "key": "overpayment_contact_accounts_receivable_tax_type",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "AccountsReceivableTaxType"
    ]
  },
  {
    "key": "overpayment_contact_accounts_payable_tax_type",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "AccountsPayableTaxType"
    ]
  },
  {
    "key": "overpayment_contact_addresses",
    "type": "json",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "Addresses"
    ]
  },
  {
    "key": "overpayment_contact_phones",
    "type": "json",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "Phones"
    ]
  },
  {
    "key": "overpayment_contact_is_supplier",
    "type": "checkbox",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "IsSupplier"
    ]
  },
  {
    "key": "overpayment_contact_is_customer",
    "type": "checkbox",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "IsCustomer"
    ]
  },
  {
    "key": "overpayment_contact_sales_default_line_amount_type",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "SalesDefaultLineAmountType"
    ]
  },
  {
    "key": "overpayment_contact_purchases_default_line_amount_type",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "PurchasesDefaultLineAmountType"
    ]
  },
  {
    "key": "overpayment_contact_default_currency",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "DefaultCurrency"
    ]
  },
  {
    "key": "overpayment_contact_xero_network_key",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "XeroNetworkKey"
    ]
  },
  {
    "key": "overpayment_contact_sales_default_account_code",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "SalesDefaultAccountCode"
    ]
  },
  {
    "key": "overpayment_contact_purchases_default_account_code",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "PurchasesDefaultAccountCode"
    ]
  },
  {
    "key": "overpayment_contact_sales_tracking_categories",
    "type": "json",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "SalesTrackingCategories"
    ]
  },
  {
    "key": "overpayment_contact_purchases_tracking_categories",
    "type": "json",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "PurchasesTrackingCategories"
    ]
  },
  {
    "key": "overpayment_contact_tracking_category_name",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "TrackingCategoryName"
    ]
  },
  {
    "key": "overpayment_contact_tracking_category_option",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "TrackingCategoryOption"
    ]
  },
  {
    "key": "overpayment_contact_payment_terms_bills_day",
    "type": "number",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "PaymentTerms",
      "Bills",
      "Day"
    ]
  },
  {
    "key": "overpayment_contact_payment_terms_bills_type",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "PaymentTerms",
      "Bills",
      "Type"
    ]
  },
  {
    "key": "overpayment_contact_payment_terms_sales_day",
    "type": "number",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "PaymentTerms",
      "Sales",
      "Day"
    ]
  },
  {
    "key": "overpayment_contact_payment_terms_sales_type",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "PaymentTerms",
      "Sales",
      "Type"
    ]
  },
  {
    "key": "overpayment_contact_updated_date_utc",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "UpdatedDateUTC"
    ]
  },
  {
    "key": "overpayment_contact_contact_groups",
    "type": "json",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "ContactGroups"
    ]
  },
  {
    "key": "overpayment_contact_website",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "Website"
    ]
  },
  {
    "key": "overpayment_contact_branding_theme_branding_theme_id",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "BrandingTheme",
      "BrandingThemeID"
    ]
  },
  {
    "key": "overpayment_contact_branding_theme_name",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "BrandingTheme",
      "Name"
    ]
  },
  {
    "key": "overpayment_contact_branding_theme_logo_url",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "BrandingTheme",
      "LogoUrl"
    ]
  },
  {
    "key": "overpayment_contact_branding_theme_type",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "BrandingTheme",
      "Type"
    ]
  },
  {
    "key": "overpayment_contact_branding_theme_sort_order",
    "type": "number",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "BrandingTheme",
      "SortOrder"
    ]
  },
  {
    "key": "overpayment_contact_branding_theme_created_date_utc",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "BrandingTheme",
      "CreatedDateUTC"
    ]
  },
  {
    "key": "overpayment_contact_batch_payments_bank_account_number",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "BatchPayments",
      "BankAccountNumber"
    ]
  },
  {
    "key": "overpayment_contact_batch_payments_bank_account_name",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "BatchPayments",
      "BankAccountName"
    ]
  },
  {
    "key": "overpayment_contact_batch_payments_details",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "BatchPayments",
      "Details"
    ]
  },
  {
    "key": "overpayment_contact_batch_payments_code",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "BatchPayments",
      "Code"
    ]
  },
  {
    "key": "overpayment_contact_batch_payments_reference",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "BatchPayments",
      "Reference"
    ]
  },
  {
    "key": "overpayment_contact_discount",
    "type": "number",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "Discount"
    ]
  },
  {
    "key": "overpayment_contact_balances_accounts_receivable_outstanding",
    "type": "number",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "Balances",
      "AccountsReceivable",
      "Outstanding"
    ]
  },
  {
    "key": "overpayment_contact_balances_accounts_receivable_overdue",
    "type": "number",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "Balances",
      "AccountsReceivable",
      "Overdue"
    ]
  },
  {
    "key": "overpayment_contact_balances_accounts_payable_outstanding",
    "type": "number",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "Balances",
      "AccountsPayable",
      "Outstanding"
    ]
  },
  {
    "key": "overpayment_contact_balances_accounts_payable_overdue",
    "type": "number",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "Balances",
      "AccountsPayable",
      "Overdue"
    ]
  },
  {
    "key": "overpayment_contact_attachments",
    "type": "json",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "Attachments"
    ]
  },
  {
    "key": "overpayment_contact_has_attachments",
    "type": "checkbox",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "HasAttachments"
    ]
  },
  {
    "key": "overpayment_contact_validation_errors",
    "type": "json",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "ValidationErrors"
    ]
  },
  {
    "key": "overpayment_contact_has_validation_errors",
    "type": "checkbox",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "HasValidationErrors"
    ]
  },
  {
    "key": "overpayment_contact_status_attribute_string",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Contact",
      "StatusAttributeString"
    ]
  },
  {
    "key": "overpayment_date",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Date"
    ]
  },
  {
    "key": "overpayment_status",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Status"
    ]
  },
  {
    "key": "overpayment_line_amount_types",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "LineAmountTypes"
    ]
  },
  {
    "key": "overpayment_line_items",
    "type": "json",
    "bodyPath": [
      "Overpayment",
      "LineItems"
    ]
  },
  {
    "key": "overpayment_sub_total",
    "type": "number",
    "bodyPath": [
      "Overpayment",
      "SubTotal"
    ]
  },
  {
    "key": "overpayment_total_tax",
    "type": "number",
    "bodyPath": [
      "Overpayment",
      "TotalTax"
    ]
  },
  {
    "key": "overpayment_total",
    "type": "number",
    "bodyPath": [
      "Overpayment",
      "Total"
    ]
  },
  {
    "key": "overpayment_updated_date_utc",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "UpdatedDateUTC"
    ]
  },
  {
    "key": "overpayment_currency_code",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "CurrencyCode"
    ]
  },
  {
    "key": "overpayment_overpayment_id",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "OverpaymentID"
    ]
  },
  {
    "key": "overpayment_currency_rate",
    "type": "number",
    "bodyPath": [
      "Overpayment",
      "CurrencyRate"
    ]
  },
  {
    "key": "overpayment_remaining_credit",
    "type": "number",
    "bodyPath": [
      "Overpayment",
      "RemainingCredit"
    ]
  },
  {
    "key": "overpayment_allocations",
    "type": "json",
    "bodyPath": [
      "Overpayment",
      "Allocations"
    ]
  },
  {
    "key": "overpayment_applied_amount",
    "type": "number",
    "bodyPath": [
      "Overpayment",
      "AppliedAmount"
    ]
  },
  {
    "key": "overpayment_payments",
    "type": "json",
    "bodyPath": [
      "Overpayment",
      "Payments"
    ]
  },
  {
    "key": "overpayment_has_attachments",
    "type": "checkbox",
    "bodyPath": [
      "Overpayment",
      "HasAttachments"
    ]
  },
  {
    "key": "overpayment_reference",
    "type": "text",
    "bodyPath": [
      "Overpayment",
      "Reference"
    ]
  },
  {
    "key": "overpayment_attachments",
    "type": "json",
    "bodyPath": [
      "Overpayment",
      "Attachments"
    ]
  },
  {
    "key": "invoice_number",
    "type": "text",
    "bodyPath": [
      "InvoiceNumber"
    ]
  },
  {
    "key": "credit_note_number",
    "type": "text",
    "bodyPath": [
      "CreditNoteNumber"
    ]
  },
  {
    "key": "batch_payment_account_code",
    "type": "text",
    "bodyPath": [
      "BatchPayment",
      "Account",
      "Code"
    ]
  },
  {
    "key": "batch_payment_account_name",
    "type": "text",
    "bodyPath": [
      "BatchPayment",
      "Account",
      "Name"
    ]
  },
  {
    "key": "batch_payment_account_account_id",
    "type": "text",
    "bodyPath": [
      "BatchPayment",
      "Account",
      "AccountID"
    ]
  },
  {
    "key": "batch_payment_account_type",
    "type": "text",
    "bodyPath": [
      "BatchPayment",
      "Account",
      "Type"
    ]
  },
  {
    "key": "batch_payment_account_bank_account_number",
    "type": "text",
    "bodyPath": [
      "BatchPayment",
      "Account",
      "BankAccountNumber"
    ]
  },
  {
    "key": "batch_payment_account_status",
    "type": "text",
    "bodyPath": [
      "BatchPayment",
      "Account",
      "Status"
    ]
  },
  {
    "key": "batch_payment_account_description",
    "type": "text",
    "bodyPath": [
      "BatchPayment",
      "Account",
      "Description"
    ]
  },
  {
    "key": "batch_payment_account_bank_account_type",
    "type": "text",
    "bodyPath": [
      "BatchPayment",
      "Account",
      "BankAccountType"
    ]
  },
  {
    "key": "batch_payment_account_currency_code",
    "type": "text",
    "bodyPath": [
      "BatchPayment",
      "Account",
      "CurrencyCode"
    ]
  },
  {
    "key": "batch_payment_account_tax_type",
    "type": "text",
    "bodyPath": [
      "BatchPayment",
      "Account",
      "TaxType"
    ]
  },
  {
    "key": "batch_payment_account_enable_payments_to_account",
    "type": "checkbox",
    "bodyPath": [
      "BatchPayment",
      "Account",
      "EnablePaymentsToAccount"
    ]
  },
  {
    "key": "batch_payment_account_show_in_expense_claims",
    "type": "checkbox",
    "bodyPath": [
      "BatchPayment",
      "Account",
      "ShowInExpenseClaims"
    ]
  },
  {
    "key": "batch_payment_account_class",
    "type": "text",
    "bodyPath": [
      "BatchPayment",
      "Account",
      "Class"
    ]
  },
  {
    "key": "batch_payment_account_system_account",
    "type": "text",
    "bodyPath": [
      "BatchPayment",
      "Account",
      "SystemAccount"
    ]
  },
  {
    "key": "batch_payment_account_reporting_code",
    "type": "text",
    "bodyPath": [
      "BatchPayment",
      "Account",
      "ReportingCode"
    ]
  },
  {
    "key": "batch_payment_account_reporting_code_name",
    "type": "text",
    "bodyPath": [
      "BatchPayment",
      "Account",
      "ReportingCodeName"
    ]
  },
  {
    "key": "batch_payment_account_has_attachments",
    "type": "checkbox",
    "bodyPath": [
      "BatchPayment",
      "Account",
      "HasAttachments"
    ]
  },
  {
    "key": "batch_payment_account_updated_date_utc",
    "type": "text",
    "bodyPath": [
      "BatchPayment",
      "Account",
      "UpdatedDateUTC"
    ]
  },
  {
    "key": "batch_payment_account_add_to_watchlist",
    "type": "checkbox",
    "bodyPath": [
      "BatchPayment",
      "Account",
      "AddToWatchlist"
    ]
  },
  {
    "key": "batch_payment_account_validation_errors",
    "type": "json",
    "bodyPath": [
      "BatchPayment",
      "Account",
      "ValidationErrors"
    ]
  },
  {
    "key": "batch_payment_reference",
    "type": "text",
    "bodyPath": [
      "BatchPayment",
      "Reference"
    ]
  },
  {
    "key": "batch_payment_particulars",
    "type": "text",
    "bodyPath": [
      "BatchPayment",
      "Particulars"
    ]
  },
  {
    "key": "batch_payment_code",
    "type": "text",
    "bodyPath": [
      "BatchPayment",
      "Code"
    ]
  },
  {
    "key": "batch_payment_details",
    "type": "text",
    "bodyPath": [
      "BatchPayment",
      "Details"
    ]
  },
  {
    "key": "batch_payment_narrative",
    "type": "text",
    "bodyPath": [
      "BatchPayment",
      "Narrative"
    ]
  },
  {
    "key": "batch_payment_batch_payment_id",
    "type": "text",
    "bodyPath": [
      "BatchPayment",
      "BatchPaymentID"
    ]
  },
  {
    "key": "batch_payment_date_string",
    "type": "text",
    "bodyPath": [
      "BatchPayment",
      "DateString"
    ]
  },
  {
    "key": "batch_payment_date",
    "type": "text",
    "bodyPath": [
      "BatchPayment",
      "Date"
    ]
  },
  {
    "key": "batch_payment_amount",
    "type": "number",
    "bodyPath": [
      "BatchPayment",
      "Amount"
    ]
  },
  {
    "key": "batch_payment_payments",
    "type": "json",
    "bodyPath": [
      "BatchPayment",
      "Payments"
    ]
  },
  {
    "key": "batch_payment_type",
    "type": "text",
    "bodyPath": [
      "BatchPayment",
      "Type"
    ]
  },
  {
    "key": "batch_payment_status",
    "type": "text",
    "bodyPath": [
      "BatchPayment",
      "Status"
    ]
  },
  {
    "key": "batch_payment_total_amount",
    "type": "number",
    "bodyPath": [
      "BatchPayment",
      "TotalAmount"
    ]
  },
  {
    "key": "batch_payment_updated_date_utc",
    "type": "text",
    "bodyPath": [
      "BatchPayment",
      "UpdatedDateUTC"
    ]
  },
  {
    "key": "batch_payment_is_reconciled",
    "type": "checkbox",
    "bodyPath": [
      "BatchPayment",
      "IsReconciled"
    ]
  },
  {
    "key": "batch_payment_validation_errors",
    "type": "json",
    "bodyPath": [
      "BatchPayment",
      "ValidationErrors"
    ]
  },
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
    "key": "code",
    "type": "text",
    "bodyPath": [
      "Code"
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
    "key": "currency_rate",
    "type": "number",
    "bodyPath": [
      "CurrencyRate"
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
    "key": "bank_amount",
    "type": "number",
    "bodyPath": [
      "BankAmount"
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
    "key": "is_reconciled",
    "type": "checkbox",
    "bodyPath": [
      "IsReconciled"
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
    "key": "payment_type",
    "type": "text",
    "bodyPath": [
      "PaymentType"
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
    "key": "payment_id",
    "type": "text",
    "bodyPath": [
      "PaymentID"
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
    "key": "bank_account_number",
    "type": "text",
    "bodyPath": [
      "BankAccountNumber"
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
    "key": "details",
    "type": "text",
    "bodyPath": [
      "Details"
    ]
  },
  {
    "key": "has_account",
    "type": "checkbox",
    "bodyPath": [
      "HasAccount"
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
  },
  {
    "key": "validation_errors",
    "type": "json",
    "bodyPath": [
      "ValidationErrors"
    ]
  },
  {
    "key": "warnings",
    "type": "json",
    "bodyPath": [
      "Warnings"
    ]
  }
];


module.exports = {
  async xero_payment_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/Payments";
    

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
