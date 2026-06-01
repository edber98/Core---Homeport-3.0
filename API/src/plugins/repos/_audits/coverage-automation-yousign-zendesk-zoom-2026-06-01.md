# Audit couverture automation - Yousign / Zendesk / Zoom

Date: 2026-06-01
Périmètre: endpoints métier utiles à l'automation (CRUD/list/search/exécution), hors configuration globale, credentials et administration plateforme.

## 1) Yousign

Coverage métier: 23/23 (100%)
Missing: 0

Covered:
- Signature requests: create/get/list/activate/cancel/delete
- Signers: create/get/list/send reminder
- Contacts: create/get/list/delete
- Documents: upload/list/download
- Audit trail download
- Webhooks: create/list/delete + webhook_event

Exclus:
- admin org/settings, token lifecycle, account governance

## 2) Zendesk

Coverage métier: 24/24 (100%)
Missing: 0

Covered:
- Tickets: create/get/update/delete/list/search
- Comments: create/list
- Tags: add/remove
- Users: create/get/update/list/search
- Organizations: create/get/list
- Groups: get/list
- Macros: list/apply
- Satisfaction ratings list
- webhook_event node

Exclus:
- account/brand/admin settings globaux, credentials/security management

## 3) Zoom

Coverage métier: 25/25 (100%)
Missing: 0

Covered:
- Meetings: create/get/update/delete/list
- Meeting details: participants, recordings, registrants
- Webinars: create/get/update/delete/list
- Recordings: list, delete, get settings
- Users/contacts: users list/get/update/get settings, contacts list/get
- Reports/dashboard: reports meetings, dashboard meetings
- Phone users list

Exclus:
- tenant admin/security/billing/settings globaux

## Validation technique

- Parse JSON manifests: OK
- Chargement handlers représentatifs: OK
