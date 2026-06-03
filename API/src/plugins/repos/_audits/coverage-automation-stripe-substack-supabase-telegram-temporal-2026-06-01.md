# Audit couverture automation - Stripe / Substack / Supabase / Telegram Bot / Temporal

Date: 2026-06-01
Périmètre: endpoints métier utiles à l'automation (CRUD/list/search/action opérationnelle), hors configuration globale, credentials, administration plateforme.

## 1) Stripe

Coverage métier: 37/37 (100%)
Missing: 0

Covered:
- Customers: create/get/update/delete/list
- Products: create/get/update/list
- Prices: create/get/list
- Payment Intents: create/get/list/confirm/cancel
- Charges: get/list
- Refunds: create/get/list
- Invoices: create/get/list/finalize/pay
- Subscriptions: create/get/update/list/cancel
- Checkout Sessions: create/get/list
- Balance: get + balance transactions list

Exclus:
- webhook admin lifecycle, account settings, billing admin interne

## 2) Substack

Coverage métier: 1/1 (100%)
Missing: 0

Covered:
- profile search by LinkedIn handle (Developer API)

Correction appliquée pendant audit:
- Fix du placeholder path dans le handler `substack_by_linkedin_get_get_post_profile_by_linkedin`

Exclus:
- publication/content management API non disponible dans ce connecteur (et hors endpoint officiel documenté ici)
- credentials/settings admin

## 3) Supabase

Coverage métier: 15/15 (100%)
Missing: 0

Covered:
- Data: select/insert/update/upsert/delete
- SQL/RPC: rpc_call
- Auth: sign_up/sign_in/get_user/list_users/delete_user
- Storage: upload/list/download/delete

Exclus:
- project settings, key management, org admin

## 4) Telegram Bot

Coverage métier: 29/29 (100%)
Missing: 0

Covered:
- Messaging: send/reply/edit/delete/forward/copy
- Media: photo/video/voice/document/sticker/contact/location/venue/poll
- Chat/user: get_chat/get_member/get_members_count/get_user profile style/get_me
- Moderation & admin: ban/unban/pin/unpin/set_chat_title
- Interaction: inline keyboard, callback answer, reactions-style UX via callbacks
- Delivery modes: get_updates/set_webhook + webhook_event node

Exclus:
- botfather setup/token provisioning (credentials/admin)

## 5) Temporal

Coverage métier: 14/14 (100%)
Missing: 0

Covered:
- Workflows: start/list/describe/query/result/signal/cancel/terminate
- Schedules: create/list/describe/update/trigger/delete

Exclus:
- namespace/admin cluster ops, security/policies, infra runtime admin

## Validation technique

- Parse JSON manifests: OK
- Handler Substack corrigé chargé (`require`): OK

## Référence doc utilisée

- Substack Developer API (LinkedIn profile search): https://support.substack.com/hc/en-us/articles/45099095296916-Substack-Developer-API
