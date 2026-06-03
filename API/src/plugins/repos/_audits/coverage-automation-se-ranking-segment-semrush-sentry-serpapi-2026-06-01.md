# Audit couverture automation - SE Ranking / Segment / Semrush / Sentry / SerpAPI

Date: 2026-06-01
Périmètre: endpoints métier utiles à l'automation (read/list/search/create/update/delete/actions opérationnelles), hors configuration globale, credentials, admin technique.

## 1) SE Ranking

Coverage métier: 12/12 (100%)
Missing: 0

Covered:
- subscription_get
- domain_overview, domain_worldwide, domain_keywords, domain_pages, domain_competitors
- keyword_volume, keyword_related
- backlinks_list, backlinks_summary
- audit_create, audit_status_get

Exclus:
- gestion compte/facturation/settings: administration
- gestion utilisateurs/permissions: configuration

## 2) Segment

Coverage métier: 21/21 (100%)
Missing: 0

Covered:
- Tracking API: identify, track, page, screen, group, alias, batch, import
- Sources: create/get/update/delete/list
- Destinations: create/get/update/delete/list
- Relations source-destination: connect, disconnect, list connected

Exclus:
- workspace governance, roles, access tokens, protocol config globale: admin/config

## 3) Semrush

Coverage métier: 10/10 (100%)
Missing: 0

Covered:
- units_balance
- domain_overview, domain_organic_keywords, domain_paid_keywords, domain_competitors
- keyword_overview, keyword_related, keyword_difficulty
- backlinks_overview, backlinks_list

Exclus:
- paramètres de compte/abonnement: admin
- endpoints techniques non orientés workflow

## 4) Sentry

Coverage métier: 10/10 (100%)
Missing: 0

Covered:
- projects_list
- project_issues_list
- project_event_get
- issue_get, issue_update, issue_delete, issue_events_list
- releases_list, release_create, release_deploy_create

Exclus:
- org/team/member admin et permissioning
- auth token lifecycle / settings globaux

## 5) SerpAPI

Coverage métier: 4/4 (100%)
Missing: 0

Covered:
- search_run
- search_results_list
- search_archive_get
- account_get (usage/quota/credits)

Ajout pendant audit:
- serpapi_account_get

Exclus:
- paramètres de compte/facturation détaillée
- gestion API keys/administration

## Validation technique

- Parse JSON manifests: OK
- Handler ajouté SerpAPI chargé (`require`): OK
- Noeud `serpapi_account_get` présent dans le manifest: OK

## Référence doc utilisée

- SerpAPI Account API: https://serpapi.com/account-api
