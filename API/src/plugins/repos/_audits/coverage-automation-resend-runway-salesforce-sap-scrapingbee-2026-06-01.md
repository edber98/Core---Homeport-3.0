# Audit couverture automation - Resend / Runway / Salesforce / SAP / ScrapingBee

Date: 2026-06-01
Périmètre: endpoints métier utiles à l'automation (read/list/search/create/update/delete/exécution), hors configuration globale, sécurité, credentials, administration d'infrastructure.

## 1) Resend

Coverage métier: 11/11 (100%)
Missing: 0

Covered:
- Emails: send, get, list
- Domains: list, get, verify
- Contacts: create, get, update, delete
- Segments: list

Exclus:
- API keys / account settings / webhook admin: configuration & credentials
- Domain provisioning lifecycle avancé non opérationnel workflow (admin DNS globale)

## 2) Runway

Coverage métier: 9/9 (100%)
Missing: 0

Covered:
- Génération: text_to_video, image_to_video, video_to_video, avatar_video
- Tâches: get, list, cancel
- Organisation: get
- Webhook event node

Exclus:
- Paramétrage organisation/compte: configuration
- Gestion sécurité/jetons: credentials

## 3) Salesforce

Coverage métier: 34/34 (100%)
Missing: 0

Covered:
- Accounts: create/get/update/delete/list
- Contacts: create/get/update/delete/list/search
- Leads: create/get/update/delete/list/convert
- Opportunities: create/get/update/delete/get/list
- Cases: create/get/update/delete/list
- Tasks: create/get/update/delete/list
- Query: SOQL query
- Webhook event node

Ajouts pendant audit:
- salesforce_case_delete
- salesforce_task_update
- salesforce_task_delete

Exclus:
- OAuth/token & connected apps: credentials/admin
- org setup, profiles, permissions, metadata admin: configuration

## 4) SAP

Coverage métier: 30/30 (100%)
Missing: 0

Covered:
- Business Partner: create/get/update/delete/list
- Sales Orders: create/get/update/list + add item
- Purchase Orders: create/get/update/list
- Billing: list/get + list items
- Materials: create/get/update/list
- Production Orders: list/get + confirm
- GL Accounts: list/get
- Cost Centers: list/get
- OData generic: get/post métier

Exclus:
- Paramétrage customizing SAP, rôles/autorisations, transport, admin technique
- sécurité/credentials et settings globaux système

## 5) ScrapingBee

Coverage métier: 5/5 (100%)
Missing: 0

Covered:
- scrape_html
- scrape_screenshot
- scrape_extract_rules
- scrape_ai_extract
- usage_get_usage

Exclus:
- health check placeholder: technique
- configuration clé/API account: credentials

## Validation technique

- Parse JSON manifests: OK
- Chargement Node des nouveaux handlers Salesforce: OK
- Noeuds ajoutés visibles dans le manifest Salesforce: OK
