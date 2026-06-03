# Audit couverture automation - Shopify / Slack / Snowflake / SQL Database / Stability AI

Date: 2026-06-01
Périmètre: endpoints métier utiles à l'automation (CRUD/list/search/action opérationnelle), hors configuration globale, credentials et administration plateforme.

## 1) Shopify

Coverage métier: 28/28 (100%)
Missing: 0

Covered:
- Products: create/get/update/delete/list/count
- Variants: get/list
- Collections: get/list
- Customers: create/get/update/list/search
- Orders: create/get/update/get/list/count/cancel/close
- Fulfillments: create/list
- Inventory: list levels, adjust, set
- Webhook event node

Exclus:
- app installation/settings, billing, webhook admin lifecycle

## 2) Slack

Coverage métier: 30/30 (100%)
Missing: 0

Covered:
- Messaging: post, reply, update, delete, schedule, ephemeral, permalink
- Reactions: add/remove/get
- Files: upload/get/list/delete
- Channels: create/get/list/archive/invite
- Pins/bookmarks: list/add/pin
- Users: list/get/profile/lookup email
- Reminders: create/list/delete

Exclus:
- workspace/org admin, app management, token/security policies

## 3) Snowflake

Coverage métier: 24/24 (100%)
Missing: 0

Covered:
- Statement API: execute/status/cancel/result partition
- Databases: create/get/list/delete
- Schemas: create/get/list/delete
- Tables: create/get/list/delete
- Warehouses: create/get/list/update/delete/resume/suspend
- API request node expert

Exclus:
- account-level governance/security/admin (roles/users/policies globaux)

## 4) SQL Database

Coverage métier: 9/9 (100%)
Missing: 0

Covered:
- select, insert, update, delete
- execute_query, execute_parameterized
- list_tables, describe_table
- call_procedure

Exclus:
- admin instance/db engine settings, auth and infra tuning

## 5) Stability AI

Coverage métier: 6/6 (100%)
Missing: 0

Covered:
- engine_list_engines
- generation_text_to_image
- generation_image_to_image
- generation_image_masking
- generation_image_upscale
- user_balance_get

Ajout pendant audit:
- stability_ai_user_balance_get

Exclus:
- account/security settings, key management, admin billing détaillée

## Validation technique

- Parse JSON manifests: OK
- Handler ajouté Stability AI chargé (`require`): OK
- Noeud `stability_ai_user_balance_get` présent dans le manifest: OK

## Référence doc utilisée

- Stability AI API reference (user balance endpoint family): https://platform.stability.ai/docs/api-reference
