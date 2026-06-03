# Audit couverture automation - WhatsApp Business / Wise / WooCommerce / WordPress

Date: 2026-06-01
Périmètre: endpoints métier utiles à l'automation (CRUD/list/search/exécution), hors configuration globale, credentials et administration plateforme.

## 1) WhatsApp Business

Coverage métier: 14/14 (100%)
Missing: 0

Covered:
- Messaging: send_text, send_template, send_image, send_document, send_contact, send_location
- Messages/media: mark_read, upload_media, get_media
- Business/account: list_phone_numbers, list_templates, get_business_profile, update_business_profile
- webhook_event node

Exclus:
- business app admin settings, token lifecycle, account governance

## 2) Wise

Coverage métier: 12/12 (100%)
Missing: 0

Covered:
- Profiles: list
- Quotes: create/get
- Recipients: create/list
- Transfers: create/get/list/fund/cancel
- Transfer extras: requirements_get, receipt_get

Exclus:
- account admin, compliance settings globales, credentials management

## 3) WooCommerce

Coverage métier: 26/26 (100%)
Missing: 0

Covered:
- Products: create/get/update/delete/list
- Orders: create/get/update/delete/list
- Customers: create/get/update/list
- Categories: create/get/list
- Coupons: create/get/delete/list
- Reporting: sales, top sellers
- Shipping zones list
- webhook_event node

Exclus:
- store settings/billing/payment gateway admin

## 4) WordPress

Coverage métier: 27/27 (100%)
Missing: 0

Covered:
- Posts: create/get/update/delete/list
- Pages: create/get/update/delete/list
- Media: upload/get/list/delete
- Comments: create/get/update/list
- Taxonomy: categories list/get/create, tags list/create
- Users: get/list
- Plugins: list
- webhook_event node

Exclus:
- site/server admin, plugin/theme installation admin avancée, credentials

## Validation technique

- Parse JSON manifests: OK
- Chargement handlers représentatifs: OK
