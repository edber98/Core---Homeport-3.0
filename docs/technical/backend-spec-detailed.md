#!/usr/bin/env markdown
# Backend Spécification Détaillée — Multi‑tenant, Sécurité, Exécutions

Ce document est le cahier des charges exhaustif du backend. Il couvre le bootstrap via variables d’environnement (entreprise/utilisateur admin par défaut), les schémas de données (ObjectId + populate), les contrôles/validations, la sécurité (AuthN/AuthZ, scoping multi‑tenant), les exécutions (moteur prod/test, erreurs/retry/wait/merge), la reprise au démarrage, et la migration complète hors localStorage.

Compléments: voir aussi
- Plan par phases et livrables: `docs/technical/backend-plan.md`
- Détails moteur et collections: `docs/technical/backend-implementation.md`

---

## 1) Bootstrap & Variables d’environnement

Objectif: au premier démarrage (DB vide), créer automatiquement l’entreprise, l’admin, les workspaces, et semer les catalogues minimaux.

Variables d’environnement (exemples):
- `SEED_COMPANY_ID=acme`
- `SEED_COMPANY_NAME="Entreprise ACME"`
- `SEED_ADMIN_EMAIL=admin@acme.io`
- `SEED_ADMIN_PASSWORD=change-me`
- `SEED_ADMIN_NAME=Admin`
- `SEED_WORKSPACES=default,marketing` (séparateur virgule)
- Optionnel multi‑tenant démo: `SEED_DEMO_SECOND_COMPANY_ID=beta`, `SEED_DEMO_SECOND_COMPANY_NAME="Entreprise BETA"`, `SEED_DEMO_USER_EMAIL=demo@beta.io`, `SEED_DEMO_USER_PASSWORD=demo`, `SEED_DEMO_WORKSPACES=beta-default,beta-ops`.

Algorithme de bootstrap:
1. Si `companies` vide: créer la company ACME (env), l’utilisateur admin (role=admin, password hashé), et les workspaces listés.
2. Si variables second tenant fournies: créer BETA + user demo + workspaces.
3. Semer providers, node_templates minimaux (start, function/http_request, condition, wait, merge, event, endpoint) et schémas d’arguments côté serveur.
4. Créer indices (voir section Indexes).

Tolérance aux redémarrages: si des documents existent, ne pas écraser; mettre à jour sémantiquement si une migration est nécessaire (scripts idempotents).

---

## 2) Modèle de données Mongo (ObjectId + populate)

Conventions:
- Toutes les références inter‑collections sont via ObjectId; utiliser `ref`/populate (ex: Mongoose) uniquement côté lecture (ne pas sur‑peupler par défaut pour éviter le N+1).
- Toutes les ressources “métier” sont scoppées par `workspaceId`; chaque workspace a `companyId`.

Schémas principaux (clés essentielles):
- companies: { _id:ObjectId, name, plan, createdAt }
- users: { _id, email:unique, name, passwordHash, companyId:ref(companies), role:'admin'|'member', createdAt }
- workspaces: { _id, name, companyId:ref(companies), createdAt }
- providers: { _id, key, name, hasCredentials, allowWithoutCredentials, credentialsSchema, createdAt }
- node_templates: { _id, key, type:'start'|'action'|'event'|'endpoint', name, providerId?:ref(providers), allowWithoutCredentials?, argsSchema, uiSchema?, createdAt }
- credentials: { _id, workspaceId:ref(workspaces), providerId:ref(providers), name, dataCiphertext, createdAt, updatedAt, valid?:bool }
- flows: { _id, workspaceId:ref(workspaces), title, description, graph, status:'draft'|'test'|'production', enabled:bool, createdAt, updatedAt }
- runs: { _id, runId:string, workspaceId:ref(workspaces), flowId:ref(flows), flowVersionId?, mode:'prod'|'test', status:'queued'|'running'|'success'|'error'|'cancelled'|'timed_out'|'partial_success', startedAt, finishedAt?, durationMs?, initialInput?, finalPayload?, finalMsg?, errors?:[ErrorInfo], metadata?:any, parentRunId? }
- run_attempts: { _id, runId, nodeId, attempt:int, kind:'trigger'|'function'|'condition'|'merge'|'delay'|'wait', templateKey?, templateRaw?, status:'pending'|'running'|'success'|'error'|'skipped'|'blocked'|'timed_out', startedAt, finishedAt?, durationMs?, argsPre?, argsPost?, input?, result?, errors?:[ErrorInfo] }
- wait_all_states: { _id, runId, nodeId, expected:int, combine:'array'|'object', objectKey?, dedupeBy?, timeoutMs?, onTimeout:'fail'|'partial_success', status, fired:bool, startedAt, updatedAt, finishedAt?, durationMs?, arrivedCount }
- wait_all_arrivals: { _id, stateId:ref(wait_all_states), runId, nodeId, fromNodeId, inputId, edgeId?, key, payload, ts }
- webhook_endpoints: { _id, workspaceId:ref(workspaces), providerId?, templateId?, secret, path:unique, createdAt }
- events_queue: { _id, workspaceId:ref(workspaces), providerId?, templateKey?, credentialId?, payload, receivedAt, correlationKey }

Populate recommandé (lecture):
- users.companyId → companies
- workspaces.companyId → companies
- node_templates.providerId → providers
- credentials.providerId/workspaceId → providers/workspaces
- flows.workspaceId → workspaces
- runs.flowId/workspaceId → flows/workspaces

Intégrité référentielle (vérifications):
- Toute création/mise à jour doit vérifier que: (1) `workspace.companyId == token.companyId`; (2) toute ref (credentialId, providerId, node_template) est visible/compatible côté tenant.
- Lors d’un transfert de ressource entre workspaces, `workspaceId` est réécrit, et les invariants sont re‑validés (ex: credentials référencés appartiennent au nouveau workspace, sinon invalider/refuser).

Indexes suggérés:
- `users(email)` unique
- `workspaces(companyId)`
- `credentials(providerId, workspaceId)`
- `node_templates(key)` + `providers(key)`
- `flows(workspaceId, updatedAt)`
- `runs(runId)` + `runs(workspaceId, flowId, startedAt)`
- `run_attempts(runId, nodeId, attempt)`
- `events_queue(correlationKey, workspaceId)`
- `webhook_endpoints(path)`

---

## 3) AuthN/AuthZ & Scoping multi‑tenant

- JWT: inclure `sub:userId`, `companyId`, `role`, `exp`.
- Garde globale /api/*: 
  - Valider JWT.
  - Charger l’utilisateur, vérifier `user.companyId == token.companyId`.
  - Pour chaque requête workspace‑scopée: vérifier `workspace.companyId == token.companyId`.
- RBAC: admin vs member. Un “member” n’accède qu’aux workspaces listés dans ses ACL (ou relation de membership); un admin voit tous les workspaces de sa company.
- Limitation d’IP sur `/webhooks/*`; CORS restrictif; CSRF non applicable côté API JWT.

Endpoints Auth:
- POST /auth/login (email+password) → JWT
- POST /auth/forgot → envoi mail avec token signé (exp ~30min)
- POST /auth/reset → valide token, change passwordHash
- POST /auth/change → user authentifié change son mot de passe

---

## 4) Providers & Credentials (sécurité)

- Chiffrement: AES‑GCM; stocker `iv`, `tag`, `ciphertext`; DEK protégée par KEK en env/KMS.
- Validation JSON Schema des credentials côté serveur (schema par provider).
- Jamais renvoyer `data` en clair côté client; déchiffrer à l’exécution uniquement.
- Endpoints: voir `backend-plan.md`.

---

## 5) Node Templates (catalogue)

- Clés sûres: regex `^[A-Za-z_][A-Za-z0-9_]*$` pour keys/names.
- Types: `start` | `action` | `event` | `endpoint`.
- Gouvernance: admin peut créer/retirer; templating versionnable (optionnel).

---

## 6) Flows CRUD + Status/Enabled

- `status:'draft'|'test'|'production'` et `enabled:boolean` persistés.
- Validation graph: 
  - Tous les nœuds référencent des `node_templates` valides (non dépréciés si policy stricte).
  - Noms de nœuds sûrs; pas de doublons.
  - Credentials référencés existent et appartiennent au `workspaceId` du flow.
- API: GET/POST/GET by id/PUT (cf. plan).

---

## 7) Moteur d’exécution (test/prod)

Contrat aligné sur la simulation frontend:
- Start payload
  - UI initialise `{ payload: null }` si absent; le backend reçoit `initialInput` tel quel et ne le modifie pas.
- Handlers
  - Signature: `async handler(node, msg, inputs, credentials)`.
  - Retourne un objet “classique” (non enveloppé) → `msg.payload = returnedObject` pour le nœud suivant.
  - `credentials` passé séparément (jamais via msg.payload);
  - Résolution: node.credentialId → défaut de template → erreur si requis.
- Modes
  - test: déclenché par UI
  - prod: déclenché par événements/endpoints; en production, déclencheurs actifs si `flow.enabled == true`.
- Attentes:
  - wait.all: agrège les arrivées (payload + provenance) selon `combine` 'array' ou 'object' (clé `objectKey`), `dedupeBy` facultatif; timeout avec `onTimeout` (fail/partial_success).
  - merge.race: envoie le premier arrivé; les autres ignorés.
- Fiabilité: per‑node attempts, retry exponentiel configurable, annulation.
- Journalisation: chaque attempt logge args pre/post, input, output/result, erreurs structurées.

Reprise au démarrage:
- Redémarrage du worker: reprendre les `runs` en `running` (idempotence) et reprogrammer les `wait`/listeners.
- Démarrer les listeners `event`/`endpoint` pour les flows en production et `enabled=true`.

---

## 8) Webhooks & Events

- `webhook_endpoints`: secrets + mapping path→flow/node.
- Ingestion `/webhooks/:workspace/:path`:
  - Dédoublonnage via `correlationKey` (ex: event id).
  - Vérifier `workspace.companyId == token.companyId` si endpoint protégé; ou signature HMAC.
  - Chaque événement crée un run (ou regroupe selon logique du flow) avec isolation.

---

## 9) Observabilité, Messages et Statuts

- Statuts `runs`: queued, running, success, error, partial_success, cancelled, timed_out.
- Messages d’anomalies:
  - Par attempt (erreurs de handler, credentials manquants, timeouts, invalid data).
  - Agrégation par run (première erreur, dernière erreur, récapitulatif par nœud).
- Logs structurés (JSON), corrélation par `runId` et `nodeId`.
- Métriques: latence p95 par template, taux d’erreurs par provider.

---

## 10) Contrôles d’intégrité & validations transversales

À chaque modification:
- Users: `email` unique, `companyId` obligatoirement existant.
- Workspaces: `companyId` obligatoire; ref user→workspace conforme aux ACL.
- Flows: `workspaceId` valide; graph valide; templates autorisés par workspace si policy.
- Credentials: `workspaceId` et `providerId` valides; data conforme au schema provider.
- Transferts (flows/forms/websites/credentials): refuser si cible d’autre entreprise; re‑valider relations (credentials du workspace cible, templates autorisés, etc.).

Erreurs & codes:
- 400 validation, 401 auth, 403 forbidden (cross‑company), 404 not found, 409 conflict (doublon), 422 unprocessable (graph/template mismatch), 429 rate limit, 5xx server.

---

## 11) Migration hors localStorage (mapping frontend→backend)

Remplacement des services simulés par endpoints:
- AccessControlService
  - listUsers → GET /api/users (scopé company)
  - listWorkspaces → GET /api/workspaces (scopé company)
  - setAllowedTemplates → PUT /api/workspaces/:ws/templates-allowed
- CompanyService
  - getCompany → GET /api/company (depuis token)
  - updateCompany → PUT /api/company
- CatalogService (extraits)
  - listFlows → GET /api/workspaces/:ws/flows
  - saveFlow → POST/PUT /api/workspaces/:ws/flows
  - listForms/saveForm → endpoints équivalents si besoin
  - listNodeTemplates → GET /api/node-templates
  - listApps/saveApp → GET/POST /api/apps (optionnel)
  - listCredentials/saveCredential → endpoints credentials
- FlowRunService
  - run → POST /api/workspaces/:ws/flows/:id/runs
  - cancel → POST /api/workspaces/:ws/runs/:id/cancel

Sécurité front: supprimer toute logique de scoping côté client (gardée en fallback), s’appuyer sur 403 du serveur.

---

## 12) Démarrage & reprise

Au boot:
- Bootstrap (seed) via ENV si DB vide (cf. §1).
- Démarrer workers (queue/engine), reprendre `runs` en cours, recharger `wait`/listeners.
- Exposer `/health` (readiness: DB + queues ok), `/metrics` si Prometheus.

Arrêt gracieux:
- Stopper ingestion webhooks; flush en cours; timeout configurable; persister états de `wait`.

---

## 13) OpenAPI/Swagger & Tests

- Spécification OpenAPI (YAML/JSON) versionnée; générer SDK si utile.
- Tests:
  - Unitaires: validation, services, crypto, mappers.
  - Intégration: endpoints clés (auth, workspaces, flows, runs, webhooks).
  - E2E minimal: scénario tenant ACME vs BETA, interdictions cross‑company.

---

## 14) Sécurité avancée

- Rotation clé JWT; invalidation reset/password (token version).
- Secrets en vault; KMS pour KEK; rotation planifiée.
- Journalisation d’accès, alerte sur échecs massifs / bruteforce.
- Limites requêtes par IP/compte; backoff sur reset/forgot.

---

## 15) Annexes

- Exemples de populate (Mongoose):
  - `RunModel.findById(id).populate('flowId').populate('workspaceId')`
  - `FlowModel.find({ workspaceId }).populate({ path:'workspaceId', select:'name companyId' })`
- Exemple de policy templates par workspace: table `workspace_templates_allowed` (ou champ sur workspace).
- Exemple de format d’erreur attempt: `{ code:'CREDENTIAL_MISSING', nodeId, message, details, ts }`.

---

Ce document, combiné avec `backend-plan.md` et `backend-implementation.md`, constitue la base de référence pour implémenter le backend en garantissant la parité fonctionnelle et la sécurité multi‑tenant requise par l’interface.

