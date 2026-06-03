# Audit couverture automation - Qonto / QuickBooks / RabbitMQ / Redis / Replicate

Date: 2026-06-01
Périmètre: endpoints métier utiles à l'automation (read/list/search/create/update/delete/action), hors config/admin/credentials/billing/settings globaux.

## 1) Qonto

Coverage métier: 14/14 (100%)
Missing: 0

Covered:
- GET /organization
- GET /bank_accounts
- GET /transactions
- GET /transactions/{transactionId}
- POST /transactions/{transactionId}/attachments
- POST /sepa/transfers
- GET /sepa/transfers
- GET /sepa/transfers/{transferId}
- GET /beneficiaries
- POST /beneficiaries
- GET /memberships
- GET /labels
- POST /clients
- GET /client_invoices

Exclus:
- webhooks management (création/suppression secrets): administration
- paramètres d'organisation et permissions: configuration

## 2) QuickBooks

Coverage métier: 35/35 (100%)
Missing: 0

Covered:
- Customers: create/get/update/list/query
- Invoices: create/get/update/delete/list/send-email
- Payments: create/get/update/list
- Items: create/get/update/list
- Vendors: create/get/update/list
- Bills: create/get/update/list
- Estimates: create/get/update/list
- Accounts: get/list
- Reports: profit and loss, balance sheet

Exclus:
- OAuth/token lifecycle: credentials
- company settings / preferences / tax setup: configuration
- app/webhook administration: administration

## 3) RabbitMQ

Coverage métier: 8/8 (100%)
Missing: 0

Covered:
- publish to queue
- publish to exchange
- publish JSON (queue/exchange)
- get single message
- get batch messages
- check queue
- purge queue
- delete queue

Exclus:
- users/vhosts/policies/permissions: administration infra
- cluster/node/runtime management: administration technique

## 4) Redis

Coverage métier: 19/19 (100%)
Missing: 0

Covered:
- key: get/set/delete/exists/expire/scan
- hash: get/set/delete
- list: push/range/pop
- set: add/members/remove
- stream: add/read
- pubsub: publish
- command execute (nœud expert déjà présent dans le connecteur)

Exclus:
- ACL / CONFIG / cluster management / replication admin: administration
- server maintenance commands: technique

## 5) Replicate

Coverage métier: 12/12 (100%)
Missing: 0

Covered:
- predictions: create/get/list/cancel
- models: get, list versions, prediction create from model
- deployments: prediction create from deployment
- trainings: create/get/list/cancel

Exclus:
- account/token/webhook secret management: configuration/credentials
- model/deployment destructive admin ops (delete/update metadata globale): administration

## Endpoints ajoutés durant cet audit

- qonto_sepa_transfers_list
- qonto_sepa_transfer_get
- qb_vendor_update
- qb_bill_update
- qb_payment_update
- qb_estimate_update
- rabbitmq_queue_delete
- redis_list_pop
- redis_set_remove
- replicate_trainings_list
- replicate_training_get
- replicate_training_cancel
- replicate_training_create

## Validation technique

- Parse JSON manifests: OK
- Handlers présents: OK
- Chargement Node (`require`) nouveaux handlers: OK
