# Audit endpoint automation — clay, clearbit, clerk, clickhouse, clickup
Date: 2026-06-01

## Méthode
- Inventaire local des nodeTemplates + handlers.
- Mapping contre la doc officielle disponible.
- Classification:
  - `COVERED`: endpoint métier représenté par un node dédié.
  - `MISSING`: endpoint métier pertinent automation absent.
  - `EXCLUDED`: endpoint hors périmètre (admin/config/billing/credentials).

---

## 1) Clay

### Couverture actuelle (COVERED)
- People: recherche + enrichissement.
- Companies: recherche + enrichissement.
- Tables: create row, list rows, get row, update row, delete row.
- Webhook send.
- Fallback: `clay_api_request`.

### Manques (MISSING)
- Aucun gap bloquant confirmé sur le périmètre actuellement documenté/publiquement exploitable dans ce connecteur.
- Gap de qualité technique: `clay_webhook_event` référencé dans le manifest sans handler correspondant.

### Exclus (EXCLUDED)
- Gestion compte/workspace/billing/permissions.

Verdict Clay: **couverture métier opérationnelle haute** avec fallback API.

---

## 2) Clearbit

### Couverture actuelle (COVERED)
- Company enrichment find.
- Person enrichment (find + combined).
- Company autocomplete.
- Reveal by IP.
- Health ping.
- Fallback: `clearbit_api_request`.

### Manques (MISSING)
- Pas de gap critique confirmé côté enrichment/reveal/autocomplete pour usage automation standard.
- Potentiel: endpoints additionnels de type `name-to-domain`/risk selon plan client (à confirmer côté contrat).

### Exclus (EXCLUDED)
- Admin tenant, credentials, gestion commerciale du compte.

Verdict Clearbit: **couverture métier élevée** sur le cœur enrichment.

---

## 3) Clerk

### Couverture actuelle (COVERED)
- Users: list/get/create/update/delete.
- Organizations: list/get/create/update/delete.
- Invitations: list/create/revoke.
- Organization invitations: create/revoke.
- Memberships: list/create/update/delete.
- Fallback: `clerk_api_request`.

### Manques (MISSING)
- `GET /organizations/{organization_id}/invitations` (listing explicite par organisation) non exposé en node dédié.
- `GET /organizations/{organization_id}/invitations/{invitation_id}` non exposé.
- `GET /organizations/{organization_id}/invitations/pending` non exposé.
- `POST /organizations/{organization_id}/invitations/bulk` non exposé.
- `POST /invitations/bulk` non exposé.

### Exclus (EXCLUDED)
- Billing credits/subscription, metadata admin global, logos, domain verification, etc.

Verdict Clerk: **très bonne couverture**, mais **quelques endpoints invitations org utiles manquent**.

---

## 4) ClickHouse

### Couverture actuelle (COVERED)
- Health: `/ping`.
- Query: `SELECT`, commande SQL générique.
- Insert: `INSERT ... JSONEachRow`.
- Discovery: list tables, describe table, list databases.
- Fallback: `clickhouse_api_request`.

### Manques (MISSING)
- Aucun endpoint HTTP métier bloquant: l’essentiel passe par SQL + endpoint HTTP générique.
- Optionnel utile: node dédié `TRUNCATE TABLE` (actuellement faisable via `query_command`).

### Exclus (EXCLUDED)
- Paramétrage serveur, profils utilisateurs, settings infra, opérations d’admin cluster.

Verdict ClickHouse: **couverture métier excellente** pour automation data.

---

## 5) ClickUp

### Couverture actuelle (COVERED)
- Tasks: create/get/update/delete/list.
- Lists: create/get/update/delete.
- Folders: create/get/list.
- Spaces/Teams: get/list.
- Comments: create/list/update/delete.
- Time entries: create/list.
- Task custom field set.
- Checklists: create checklist + create checklist item.
- Tags list.
- Fallback: `clickup_api_request`.

### Manques (MISSING)
- `PUT /checklist/{checklist_id}/checklist_item/{checklist_item_id}` (update item checklist).
- `DELETE /checklist/{checklist_id}/checklist_item/{checklist_item_id}` (delete item checklist).
- `PUT /team/{team_id}/time_entries/{timer_id}` (update time entry).
- `DELETE /team/{team_id}/time_entries/{timer_id}` (delete time entry).
- Commentaires list/chat view/list view (au-delà du task comment) non dédiés.

### Exclus (EXCLUDED)
- Workspaces settings, guests/admin permissions, OAuth/apps admin.

Verdict ClickUp: **couverture large**, reste quelques actions opérationnelles utiles sur checklist/time tracking.

---

## Synthèse globale

- Couverture métier actuelle estimée:
  - Clay: 90%+
  - Clearbit: 90%+
  - Clerk: ~80-85%
  - ClickHouse: 95%+
  - ClickUp: ~85-90%

## Priorités d’implémentation (ordre recommandé)
1. Clerk: invitations org list/get/pending/bulk.
2. ClickUp: checklist item update/delete + time entry update/delete.
3. Clearbit: nœuds dédiés complémentaires (name-to-domain/risk) si plan client actif.
4. Clay: corriger incohérence `clay_webhook_event` (manifest vs handler).
