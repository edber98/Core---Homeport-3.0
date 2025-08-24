# Backend — Architecture, Modules, and Build Order

Objectif: fournir un guide concret pour implémenter un backend supportant:
- Nœuds sensibles aux identifiants (création, sélection, validation).
- Nouveaux types de nœuds: `event` (déclencheurs) et `endpoint` (expositions).
- Déclencheurs Gmail/Telegram d’exemple.
- Flux et exécution des graphes (DAG) avec injection parent (`Start.allowParentInput`).
- Contrôles automatiques côté serveur (validation, sécurité, idempotence).

Le guide est agnostique de framework, avec exemples en Node.js/NestJS. Adaptez les patterns à votre stack (FastAPI, Spring, etc.).


## Glossaire rapide
- Provider: intégration applicative (p.ex. `gmail`, `telegram`).
- Credential: identifiant chiffré associé à un provider et un workspace.
- NodeTemplate: modèle de nœud (type, schémas d’arguments, contraintes).
- Flow: graphe orienté (nœuds + arêtes) décrivant un processus.
- Event: entrée externe (webhook, polling, bus) qui démarre un flow.
- Run/Job: exécution d’un flow pour une instance/payload donné(e).


## Architecture d’ensemble
- API HTTP (REST) + Webhooks publics + WebSocket/SSE pour suivi de run.
- Orchestrateur d’exécution (engine) + Planificateur (polling, retries).
- Base de données: MongoDB (obligatoire) — collections listées ci-dessous.
- Chiffrement au repos des credentials (KMS ou libsodium + envelope keys).
- Message broker optionnel (BullMQ/Redis, SQS, RabbitMQ) pour découpler.


## Modèle de données MongoDB (collections minimales)
- `workspaces` { _id, name, createdAt }
- `providers` { _id, key, name, hasCredentials, allowWithoutCredentials, credentialsSchema, createdAt }
- `credentials` { _id, workspaceId, providerId, name, dataCiphertext, createdAt, updatedAt, valid?: boolean }
- `node_templates` { _id, key, providerId?, type: 'action'|'event'|'endpoint'|'start', name, allowWithoutCredentials?, version, argsSchema, uiSchema, createdAt, deprecated?: boolean }
- `flows` { _id, workspaceId, title, description, graph, versions?: [{ v, graph }], createdAt, updatedAt, valid?: boolean }
- `runs` { _id, runId, flowId, flowVersionId, mode: 'prod'|'test', status: 'queued'|'running'|'success'|'error'|'cancelled'|'timed_out'|'partial_success', startedAt, finishedAt?, durationMs?, initialInput?, initialCtx?, finalPayload?, finalMsg?, errors?: [ErrorInfo], metadata?: any, parentRunId? }
- `run_attempts` { _id, runId, nodeId, attempt, kind: 'trigger'|'function'|'condition'|'merge'|'delay'|'wait', templateKey?, templateRaw?, status: 'pending'|'running'|'success'|'error'|'skipped'|'blocked'|'timed_out', startedAt, finishedAt?, durationMs?, argsPre?, argsPost?, input?, result?, errors?: [ErrorInfo] }
- `wait_all_states` { _id, runId, nodeId, exec, expected, combine, objectKey, dedupeBy, timeoutMs, onTimeout, status, fired, startedAt, updatedAt, finishedAt?, durationMs?, arrivedCount }
- `wait_all_arrivals` { _id, stateId, runId, nodeId, fromNodeId, inputId, edgeId?, key, payload, ts }
- `webhook_endpoints` { _id, workspaceId, providerId?, templateId?, secret, path, createdAt }
- `events_queue` { _id, workspaceId, providerId?, templateKey?, credentialId?, payload, receivedAt, correlationKey }

Notes:
- `flows.graph` contient nœuds/arêtes, y compris références à `node_templates` et éventuelles `credentialId` sélectionnées.
- `credentials.dataCiphertext` contient le JSON chiffré du credential.
- Index conseillés: `runs(runId)`, `run_attempts(runId,nodeId,attempt)`, `events_queue(correlationKey,workspaceId)`, `webhook_endpoints(path)`, `credentials(providerId,workspaceId)`.


## API surface (endpoints principaux)
- Providers
  - `GET /api/providers` — liste (+ schémas de credentials).
- Credentials
  - `GET /api/workspaces/:ws/credentials`
  - `POST /api/workspaces/:ws/credentials` — crée (valide via schema du provider; chiffre `data`).
  - `GET /api/workspaces/:ws/credentials/:id`
- NodeTemplates (catalogue)
  - `GET /api/node-templates`
  - `POST /api/node-templates` — admin only.
- Flows
  - `GET /api/workspaces/:ws/flows`
  - `POST /api/workspaces/:ws/flows` — crée (Title/Description seulement).
  - `GET /api/workspaces/:ws/flows/:id`
  - `PUT /api/workspaces/:ws/flows/:id` — met à jour `graph_json`.
- Runs
  - `POST /api/workspaces/:ws/flows/:id/runs` — démarre un run (mode=`prod|test`, input optionnel; supporte `allowParentInput`).
  - `GET /api/workspaces/:ws/runs/:id` — statut + noeuds.
  - `GET /api/workspaces/:ws/runs/:id/stream` — SSE/WebSocket.
- Webhooks / Events
  - `POST /webhooks/:workspace/:endpoint` — réception d’événements (Telegram, custom, etc.).
  - `POST /api/admin/providers/gmail/watch` — optionnel (registre Pub/Sub) ; sinon polling.


## Sécurité & contrôles automatiques
- Noms de nœuds: valider côté serveur en regex `^[A-Za-z_][A-Za-z0-9_]*$`.
- Credentials requis: refuser le run si un nœud avec `provider.has_credentials=true` est utilisé et qu’aucun credential n’est lié, à moins que `provider.allow_without_credentials=true` ou `template.allow_without_credentials=true`.
- Accès: scoper chaque ressource par `workspace_id`; RBAC simple (owner, editor, viewer).
- Chiffrement: crypter `credentials.data` (AES-GCM) avec une DEK unique chiffrée par une KEK (KMS/env). Rotation possible.
- Idempotence: sur endpoints webhook, dériver une `correlation_key` (p.ex. event id) pour dédoublonnage.
- Limitations: rate limiting IP sur `/webhooks/*`, auth sur `/api/*` (JWT/OAuth2).


## Ordre de création des modules (proposition Express)
1) AuthN/AuthZ (priorité)
   - Authentification (JWT/OAuth2) + stockage des utilisateurs et mots de passe (hashés, p.ex. bcrypt).
   - Password reset par lien signé + expiration; change password.
   - Multi-tenant: chaque utilisateur est lié à une `company` et charge ses workspaces/ressources au login.
   - Company & tenancy:
     - Tables:
       - `companies` { _id, name, plan, createdAt }
       - `users` { _id, email, name, passwordHash, companyId, role, createdAt }
       - `workspaces` { _id, companyId, name, createdAt }
     - Règle: toutes les ressources (flows/forms/websites/credentials/runs) sont scoppées par `workspaceId` qui lui-même appartient à une `companyId`.
     - Au login: charger `company`, la liste des `workspaces` accessibles, et injecter `companyId` dans le contexte de requête.
     - Accès: un user n’accède qu’aux workspaces de sa company; RBAC (admin/member) restreint l’édition globale.
     - Reset/changement de mot de passe: endpoints `/auth/forgot` (email token), `/auth/reset`, `/auth/change`.
   - RBAC simple (admin/member) et guards.
2) Core
   - Config, Logger, Crypto (chiffrement), Database (ODM/ORM + migrations) — Express.
3) Workspaces
   - CRUD minimal + guard pour scoper l’accès.
   - API doit retourner uniquement les workspaces de l’entreprise de l’utilisateur authentifié (scoping server-side, pas côté client).
   - Rappels:
     - `workspaces.companyId` doit égaler `token.companyId`.
     - Un membre non-admin ne voit/édite que les workspaces explicitement autorisés (rôle/ACL).
4) Providers (catalogue des intégrations)
   - Entité + seed: `gmail`, `telegram` avec `has_credentials=true`, `allow_without_credentials=false`.
   - `credentials_schema_json` (JSON Schema) par provider.
5) Credentials
   - CRUD sécurisé: validation JSON Schema côté serveur; chiffrement des `data`.
   - Résolution d’un credential par `id` et `workspace_id`.
6) NodeTemplates (catalogue des nœuds)
   - Entité + seed: `start`, `http_request`, `gmail.receive_email` (type `event`), `telegram.message_received` (type `event`), `endpoint.http` (type `endpoint`).
   - Champs: `type`, `provider_id?`, `allow_without_credentials?`, `args_schema_json`.
7) Flows
   - CRUD + validation serveur du `graph_json` (cohérence des templates, noms sûrs, références credentials existantes/du workspace).
8) Webhooks
   - Table `webhook_endpoints` + endpoint public `/webhooks/:workspace/:path`.
   - Mécanisme de mapping provider/template -> `path` (ex: `telegram/<token_hash>` ou id opaque).
9) Event Ingestion
   - Contrat: transforme une requête (webhook) ou une itération de poller en `events_queue`.
   - Déduplication par `correlation_key`.
10) Orchestrateur (Runs)
   - Service de planification: consomme `events_queue` et crée un `run` d’un flow cible (lié au template `event`).
   - Exécution DAG: topological run, gestion des sorties/erreurs, retries exposants.
11) Adapters Providers
   - `gmail`: polling minimal (list unread with query/label) + mapping payload standard.
   - `telegram`: long polling `getUpdates` ou webhook + mapping payload.
12) Endpoint Nodes
   - Exposition d’un endpoint HTTP (type `endpoint`) qui démarre un run avec un payload signé/validé.
13) Observabilité
   - Logs structurés, métriques (p95 latence par template), traces si dispo.
14) Admin & Outils
- Rotation clés, purge runs, réindexation.
\
Réinitialisation (Reset) — Multi-tenant
- But: repartir d’un état propre (démo) et forcer la reconnexion pour choisir l’entreprise et l’utilisateur.
- Côté backend, prévoir une commande/endpoint d’admin (protégé) qui:
  - Purge les collections métiers: flows/forms/websites/templates/apps/credentials/runs/events.
  - Purge les ACL: users (facultatif), workspaces; conserve les entreprises (ou recharge un seed ACME/BETA selon environnement).
  - Invalide les sessions (tokens JWT blacklistés ou rotation de la clé de signature si acceptable).
- Côté frontend (simulation):
  - Efface localStorage des modules: catalogue, ACL (utilisateurs/workspaces/mapping), entreprises, authentification (mots de passe/tokens/reset), session.
  - Redirige vers `/login`.
  - Au login: l’entreprise est déduite de l’utilisateur; l’UI charge l’“Entreprise” correspondante dans Paramètres.

Schéma multi-entreprises (récap)
- `companies` (ACME, BETA)
- `workspaces` portent `companyId`.
- `users` portent `companyId`.
- Toute ressource est scoppée par `workspaceId` → `companyId`.
- Au login: charger l’entreprise et les workspaces accessibles; chaque requête /api utilise un guard (token.companyId == resource.companyId).


## Contrats internes (types) — exemple TypeScript
```ts
type Provider = {
  id: string; key: 'gmail'|'telegram'|string; name: string;
  hasCredentials: boolean; allowWithoutCredentials: boolean;
  credentialsSchema: JSONSchema7;
};

type NodeTemplate = {
  id: string; key: string; type: 'start'|'action'|'event'|'endpoint'; name: string;
  providerId?: string; allowWithoutCredentials?: boolean;
  argsSchema: JSONSchema7; uiSchema?: any;
};

type FlowGraph = {
  nodes: Array<{ id: string; templateId: string; name: string; args: any; credentialId?: string }>;
  edges: Array<{ id: string; source: string; target: string; label?: string }>;
};
```

Règles de nommage & mapping fonction
- `NodeTemplate.name` et `title`: doivent être “function-safe” (pas d’espaces), regex `^[A-Za-z_][A-Za-z0-9_]*$`.
- `Flow.nodes[].name`: idem; utilisé comme identifiant stable et pour l’audit.
- Mapping handler: `handlerKey = normalize(NodeTemplate.key || NodeTemplate.name)` (suppression de préfixes, toLowerCase).
- Le backend refuse la création/mise à jour de templates/flows si ces contraintes ne sont pas respectées.


## Exécution d’un Flow (DAG)
- Entrée: un `run` a un `input_json` initial.
- Start/Triggers:
  - `start`: injecte `input_json` dans le premier nœud; si `allowParentInput=true` en sous-flow, fusionne `parent.input` -> `run.input`.
    - Par défaut (UX), le payload Start côté UI est initialisé à `{ payload: null }` si absent; il est éditable et persistant par flow, puis envoyé comme `initialInput` au backend lors du POST /runs.
  - `event`: créé par ingestion d’événement; `payload` = `run.input` initial.
  - Statut d’un flow: ajoutez `status: 'draft'|'test'|'production'` et `enabled: boolean` sur le document flow. En production, les déclencheurs ne s’activent que si `enabled=true`.
- Résolution credentials: pour un nœud, choisir dans l’ordre: `node.credentialId` -> défaut de template (si défini) -> erreur si requis.
- Isolation: chaque nœud reçoit `{input, context, credentials}` et retourne `{output, next}`.
- Gestion erreurs: stratégie retry (p.ex. 3 tentatives, backoff), marquage `run_nodes.error_json`.


## Moteur d’exécution (Mongo + modes prod/test)


Sandbox d’expressions (exemple Node.js)
- Ajoutez un mini-sandbox pour les expressions `{{ ... }}` permettant un rendu frontend-like côté serveur (voir exemple fourni — `expression-sandbox.js`).
- Garde: uniquement des expressions (pas d’instructions), blocage des globaux dangereux, timeout strict.
- API: `evaluateExpression`, `evaluateTemplateDetailed` (multi-îlots; en cas d’erreur, conserve le texte brut de l’îlot fautif et journalise).

Esquisse d’exécuteur (engine)
- Normalisation des types de nœuds: start | function | condition | event | endpoint.
- Registre de fonctions: `functionRegistry[normalize(templateKey)](node, msg, inputs)` retourne un objet de résultat “classique”.
- Contexte d’éval: `evalCtx = { ...initialContext, msg, payload: msg.payload }`; rendu via `deepRender` des `args_pre` ⇒ `args_post`.
- Orchestration topologique simple avec logs par nœud

Résolution et passage des credentials aux handlers
- Résolution au runtime, par nœud:
  1) `node.credentialId` explicite s’il existe et appartient au workspace
  2) valeur par défaut du template (facultative)
  3) erreur si le provider exige des credentials et qu’aucun n’est disponible
- Déchiffrement juste avant l’exécution du nœud; ne jamais logguer les secrets.
- Le moteur passe l’objet `credentials` au 4ᵉ paramètre du handler (et non via `msg.payload`).
- Les contrôles automatiques valident la présence/portée des credentials avant lancement.
 (`args_pre`, `args_post`, `input`, `result`, timings) et mise à jour de `msg.payload` par le résultat brut de la fonction.
- Conditions: `firstMatch` (par défaut) sur items `{ name, condition }` où `condition` peut être îlot unique, expression nue ou template mixte; branche gagnante choisie par label.


Vue d’ensemble
- Orchestrateur: résout paramètres (templates {{ ... }} + expressions {"$expr": "..."}), appelle les handlers (registre), évalue conditions, gère fan-out/fan-in, publie des événements temps réel (SSE/WS).
- Deux modes d’exécution: `test` (effets mock/shadow/allow, logs verbeux, temps plafonnés) et `prod` (effets réels, idempotency, retries, timeouts).

Schémas de persistance (Mongo)
- `runs`: document principal d’exécution (voir collection ci-dessus) avec `mode`.
- `run_attempts`: 1 document par passage effectif d’un nœud (retries => plusieurs documents).
- `wait_all_states` et `wait_all_arrivals`: gestion crash-safe de la barrière `wait.all`.

Format temps réel (UI)
- Événements SSE/WS:
  - `run.status` { run: { id, flowVersionId, mode, status, startedAt, finishedAt?, durationMs?, progress? } }
  - `node.status` { nodeId, exec, data: Partial<NodeLive> }
  - `node.progress` { nodeId, exec, progress }
  - `node.result` { nodeId, exec, result }
  - `node.error` { nodeId, exec, error }
  - `log` { level, nodeId?, exec?, msg }

Rendu des paramètres
- Templates `{{ ... }}`: rendu frontal-like, sandbox JS. Multi-îlots: chaque îlot est évalué; en cas d’erreur, conserver le texte brut et tracer l’erreur (cf. exemple de sandbox plus bas).
- Expressions serveur `{"$expr": "..."}`: racine `$` avec `$.input`, `$.env`, `$.now`, etc. (pas de `$.output`). Évaluation déterministe (quota ~10ms).
- Contexte d’éval UI: `ctx` ne contient que `input` (les champs d’entrée utiles du nœud précédent), pas d’`output`.
- Résolution finale: `args_post = deepRender(args_pre, evalCtx)` puis `finalParams = deepMerge($.input, args_post, precedence='params')`.

Enregistrement I/O
- Pour chaque tentative de nœud:
  - `argsPre`: paramètres bruts.
  - `argsPost`: après rendu (templates + $expr).
  - `input`: payload d’entrée local (du/ des prédécesseur(s)).
  - `result`: sortie du handler (ou détail condition).

Ordonnancement & parallélisme
- Intra-run: FIFO déterministe, branches parallélisables dès que prêtes.
- Inter-runs: round-robin pondéré + quotas (global/tenant/template). `concurrencyKey` facultatif pour sérialiser.

Nœuds spéciaux
- `condition`: `mode` = `firstMatch|allMatches|elseOnlyIfNoMatch`; sorties selon matches.
- `wait.all` (Promise-All): attend N entrées, calcule la progression via `done/total`, et produit un `payload` agrégé:
  - `payload` sous forme `array` ou `object` (selon `combine`), indexant par `nodeId`/`edgeId`/`inputId` (selon `objectKey`).
  - Chaque élément contient `{ from: { nodeId, inputId, edgeId }, value }` où `value` = payload du prédécesseur.
  - Idempotence via `wait_all_arrivals` (clé `stateId + key`).
- `merge.race` (Promise-Race): termine à la première arrivée et produit un `payload` = valeur de la branche gagnante, avec métadonnées `{ winner: { nodeId, inputId }, losers?: [...] }`.

Production vs Test
- `test`: sideEffects=`mock` par défaut; retries off (ou 1), timeouts courts, logs verbeux, `$.now` figé au début.
- `prod`: effets réels (HTTP/Mail/etc.), idempotency, retries/backoff, timeouts stricts.

Règles d’écriture (helpers)
- `nodeStart` → status:`running`, timestamps, progression initiale.
- `nodeProgress` → met à jour `percent/label/sub`.
- `nodeFinish` → `status`, `result|error`, timings et mise à jour `runs.finalPayload` de compat.

Nœuds `event` — écoute continue (long-lived listeners)
- Un nœud de type `event` représente une source d’événements (webhook, polling, bus) qui ne “termine” pas en soi et continue d’écouter tant que “play” reste activé.
- Gestion recommandée:
  - Enregistrer un “listener” (collection `listeners`) avec `provider`, `templateKey`, `credentialId`, `flowId`, `args`, `status: 'active'|'paused'|...`.
  - L’UI “play” activé = `status='active'` (reste enfoncé); “désactiver” = `status='paused'` (n’écoute plus).
  - Chaque événement ingéré crée un `run` indépendant (`trigger_type='event'`) avec `initialInput` = payload; idempotence par `correlation_key`.


## Gmail — déclencheur d’exemple (minimal viable)
Approche 1 (recommandée pour un MVP): Polling périodique.
- Credential requis: `{accountEmail, clientId, clientSecret, refreshToken}`.
- Job planifié (par credential + template args `query/label`):
  1) `listMessages` avec `q=query` + label `INBOX`.
  2) Filtrer messages non traités (conserver `historyId`/`messageId` comme `correlation_key`).
  3) Enqueue événements (`events_queue`) avec payload normalisé `{messageId, threadId, snippet, headers, raw?}`.

Approche 2: Push via Gmail Watch + Pub/Sub (plus complexe, nécessite infra GCP).


## Telegram — déclencheur d’exemple
Option A: Webhook.
- À la création du credential `{botToken}`, appeler `setWebhook` vers `/webhooks/:ws/telegram/:endpoint`.
- Recevoir updates, dédupliquer sur `update_id` (correlation_key), mapper payload.

Option B: Long polling `getUpdates` (simple à héberger, pas d’IP publique requise).
- Planifier un poller par credential, mémoriser `offset` pour idempotence.


## Endpoint nodes (type `endpoint`)
- Créer un endpoint HTTP signé pour démarrer un flow depuis des systèmes tiers.
- Recommandations:
  - Path opaque: `/webhooks/:ws/ingest/:id` avec secret HMAC.
  - Validation: JSON Schema sur `payload` (dérivé du `args_schema` du template d’endpoint).
  - Sécurité: timestamp + signature `X-Signature` (HMAC-SHA256) + fenêtre de 5 min.


## Validation serveur (contrôles automatiques)
- `graph_json`:
  - Tous les `node.name` respectent la regex.
  - `templateId` pointent vers des templates existants.
  - `credentialId` (si fourni) appartient au `workspace` de l’utilisateur.
  - Pour chaque nœud lié à un provider: refuser si credential requis et absent.
- `credentials`:
  - Valider `data` via `provider.credentials_schema_json`.
  - Stocker `data_ciphertext`, jamais le clair.
  - Empêcher création si `allow_without_credentials=false` sur provider et on tente de marquer « allowWithout » (côté admin uniquement au niveau template).


## Configuration (env)
- `MONGODB_URI` — chaîne de connexion MongoDB.
- `REDIS_URL` — si BullMQ.
- `ENCRYPTION_MASTER_KEY` — KEK pour enveloppe.
- `JWT_SECRET` — API auth.
- `BASE_URL` — pour webhooks publics.
- `POLL_INTERVAL_GMAIL=60s`, `POLL_INTERVAL_TELEGRAM=2s`.


## Tests
- Unitaires: crypto, validation schema, mapping providers.
- Intégration: CRUD credentials (chiffrement), exécution DAG sur mini-flow.
- E2E: webhook Telegram simulé, polling Gmail mocké, vérif `runs`.
- Idempotence: répéter même événement, vérifier un seul `run`.


## Plan de livraison (itératif)
1) Core + DB + Migrations + Crypto.
2) Providers + Credentials (CRUD + chiffrement + validation JSON Schema).
3) NodeTemplates (seed start, action http, event gmail/telegram, endpoint http).
4) Flows (CRUD + validation `graph_json`).
5) Orchestrateur (exécution séquentielle simple, sans parallélisme au début).
6) Webhooks + Event ingestion + déduplication.
7) Pollers (Telegram long polling, Gmail polling simple).
8) Runs streaming (SSE/WebSocket) + métriques de base.
9) Retries + backoff + DLQ (dead-letter queue) si broker.
10) Webhook Telegram (optionnel) + Gmail Watch (optionnel GCP).


## Exemples d’objets seed (résumé)
Provider `gmail`:
```json
{
  "key": "gmail",
  "name": "Gmail",
  "has_credentials": true,
  "allow_without_credentials": false,
  "credentials_schema_json": {
    "type":"object",
    "required":["accountEmail","clientId","clientSecret","refreshToken"],
    "properties":{
      "accountEmail":{"type":"string","format":"email"},
      "clientId":{"type":"string"},
      "clientSecret":{"type":"string"},
      "refreshToken":{"type":"string"}
    }
  }
}
```

Template `gmail.receive_email` (type event):
```json
{
  "key":"gmail.receive_email",
  "type":"event",
  "provider_key":"gmail",
  "name":"Recevoir un mail",
  "allow_without_credentials": false,
  "args_schema_json": {
    "type":"object",
    "properties": {
      "label": {"type":"string","default":"INBOX"},
      "query": {"type":"string","default":"is:unread"}
    }
  }
}
```

Provider `telegram` + template `telegram.message_received` similaire (credential `{botToken}`).


## Notes d’intégration UI ↔ Backend
- Le frontend envoie `graph_json` avec `credentialId` sélectionné par nœud si applicable.
- Le backend ré-évalue la nécessité d’un credential (contrôle automatique) et renvoie des erreurs précises par nœud.
- `start.allowParentInput`: lorsque `POST /runs` est appelé pour un sous-flow, fournir un `parent_run_id` et fusionner `parent.input` vers `run.input` selon votre politique (merge shallow conseillé).


## Checklist de sécurité
- Secrets jamais loggés; redaction des champs sensibles.
- Rotation clé possible (versionner KEK et ré-chiffrer DEK au besoin).
- Signature HMAC des webhooks entrants sortants (si applicable).
- CORS strict, CSRF non applicable aux webhooks mais protéger `/api/*`.


---
Besoin d’un squelette NestJS (modules/services/entities) prêt-à-coder ? Indiquez-le et je fournirai une arborescence + snippets pour accélérer le démarrage.


## Contrôles automatiques par type de changement (Change Management)

Objectif: définir précisément les validations et effets en chaîne à exécuter dès qu’un élément est créé/mis à jour/supprimé, afin d’assurer l’intégrité des liens (flows ↔ templates ↔ providers ↔ credentials ↔ webhooks) et la cohérence d’exécution.

Règles globales (invariants)
- Références fortes: aucun identifiant de provider/template/credential/flow ne doit pointer vers une entité inexistante ou archivée (sauf versioning explicite).
- Versioning conseillé: `node_templates.version` pour permettre des migrations contrôlées; flows pin par `template_id` + `version`.
- Transactions: toute opération de mutation critique doit être atomique; publier des événements de domaine après commit seulement.
- Revalidation systématique: après mutation, recalculer la validité des entités dépendantes et consigner les erreurs adressables (par nœud, par flow).
- Erreurs structurées: code, message, path (p.ex. `node[Start].credentialId`).

1) Provider (création/mise à jour/suppression)
- Création:
  - Valider unicité de `key`.
  - Si `has_credentials=true`: exiger `credentials_schema_json` valide (JSON Schema).
  - Publier `provider.created`.
- Mise à jour:
  - Si changement `allow_without_credentials`: revalider tous les flows ayant des nœuds liés à ce provider; marquer erreurs si désormais requis et absent.
  - Si changement de `credentials_schema_json`: marquer tous credentials de ce provider en `validation_pending`; job asynchrone revalide et marque `valid/invalid` avec détails.
  - Publier `provider.updated` + champs modifiés.
- Suppression/archivage:
  - Interdire la suppression si des templates actifs référencent le provider; sinon archiver.
  - Marquer flows dépendants en `invalid` avec erreur explicite.

2) Credentials (création/mise à jour/suppression)
- Création:
  - Valider `data` via JSON Schema du provider; chiffrer; marquer `valid=true`.
  - Publier `credential.created`.
- Mise à jour:
  - Revalider contre le schema actuel; si invalide => refuser ou sauver en `valid=false` selon stratégie, mais ne jamais briser atome si flow en cours (utiliser version N, activer N+1 pour nouveaux runs).
  - Revalider tous les flows du workspace qui référencent ce credential; lever/retirer erreurs.
  - Publier `credential.updated`.
- Suppression:
  - Soft-delete avec `deleted_at`; interdire si utilisé par un `run` `running`; sinon autoriser et marquer flows comme invalides si aucune alternative.
  - Publier `credential.deleted`.

3) NodeTemplate (création/mise à jour/dépréciation/suppression)
- Création:
  - Valider cohérence type (`event|endpoint|action|start`), schémas d’arguments/UI.
  - Si lié à un provider avec `has_credentials=true` et `allow_without_credentials=false`, forcer `allow_without_credentials=false` au template.
  - Publier `template.created`.
- Mise à jour:
  - Si changement breaking (schema args non rétro-compatible): incrémenter `version`; conserver ancienne version active jusqu’à migration.
  - Revalider tous les flows qui référencent `template_id` + `version` impactés; lier erreurs par nœud (ex: arg manquant, type invalide).
  - Publier `template.updated` avec `compat: breaking|non_breaking`.
- Dépréciation:
  - Marquer `deprecated=true`, empêcher nouvelle utilisation mais ne pas invalider flows existants.
  - Publier `template.deprecated`.
- Suppression:
  - Interdire si still-referenced; sinon supprimer ou archiver (`deleted_at`).

4) Flow (création/mise à jour/suppression)
- Création:
  - Valider `graph_json` complet:
    - Noms sûrs regex; unicité des noms dans le flow.
    - Existence des templates/versions; compatibilité args via JSON Schema; références `credentialId` du même workspace.
    - Contrainte start/trigger: maximum un `start` implicite, événements doivent avoir sortie; endpoints mappés.
  - Marquer `valid=true|false` avec détails si échecs.
- Mise à jour du `graph_json`:
  - Revalider tout le graphe; recalculer `webhook_endpoints` associés aux nœuds `endpoint` (création/rotation si path change).
  - Si un nœud change de template version -> revalider args; si cred requis -> exiger `credentialId`.
  - Publier `flow.updated` + delta (nœuds ajoutés/supprimés/modifiés).
- Suppression:
  - Soft-delete; empêcher suppression si `run.running` attaché; sinon autoriser.
  - Publier `flow.deleted`.

5) Webhook endpoints (création/mise à jour/rotation)
- Création:
  - Générer `secret` HMAC; réserver `path` opaque; lier `workspace_id` + nœud `endpoint`.
  - Publier `webhook.created`.
- Mise à jour (changement de path/secret):
  - Rotation atomique: accepter ancien et nouveau pendant fenêtre de grâce si nécessaire.
  - Publier `webhook.updated`.
- Suppression:
  - Révoquer immédiatement; publier `webhook.deleted`.

6) Runs/Orchestrateur (impacts indirects)
- Si un flow devient `invalid` pendant un run: laisser terminer le run courant; empêcher nouveaux runs tant que `valid=false`.
- Sur changement de credential pendant run: continuer avec snapshot résolu au démarrage du run.

7) Workspace (suppression)
- Orchestration: annuler runs en cours, révoquer webhooks, supprimer/archiver flows, credentials, endpoints dans une transaction ou job orchestré.

Tâches de revalidation (asynchrones)
- Job `revalidate:flows` (par workspace):
  - Recalculer la validité de tous les flows; produire un rapport sommaire.
- Job `revalidate:credentials` (par provider):
  - Revalider tous les credentials contre le schema courant; marquer invalides avec raisons.

Pseudo-code de revalidation (flow)
```ts
function validateFlow(flow: FlowGraph, ctx: Ctx): ValidationResult {
  const errors: NodeError[] = [];
  // 1) Structure
  checkNames(flow.nodes, errors);
  checkEdges(flow, errors);
  // 2) Templates & versions
  for (const n of flow.nodes) {
    const tmpl = ctx.templates.get(n.templateId, n.version);
    if (!tmpl) errors.push(err(n, 'template.not_found'));
    else validateArgs(n.args, tmpl.argsSchema, errors, n);
    // 3) Credentials
    const prov = tmpl.providerId ? ctx.providers.get(tmpl.providerId) : null;
    const needsCred = prov?.hasCredentials && !(prov.allowWithoutCredentials || tmpl.allowWithoutCredentials);
    if (needsCred && !n.credentialId) errors.push(err(n, 'credential.required'));
    if (n.credentialId && !ctx.credentialBelongsToWorkspace(n.credentialId, ctx.ws)) errors.push(err(n, 'credential.scope_mismatch'));
  }
  return { valid: errors.length === 0, errors };
}
```

Erreurs standardisées (exemples)
- `template.not_found`, `template.version_incompatible`
- `args.schema_invalid`, `args.required_missing`, `args.type_mismatch`
- `credential.required`, `credential.invalid`, `credential.scope_mismatch`
- `graph.edge_orphan`, `graph.multiple_starts`, `graph.cycle_detected`

Notifications temps réel
- Publier des événements (p.ex. via WS/SSE) pour refléter les états `valid/invalid` et détails par nœud après chaque mutation.

Performance & robustesse
- Batcher les revalidations (debounce 250–500 ms) lors de modifications rapides en UI.
- Cap mémoire: limiter la taille de `graph_json`; compresser si nécessaire.
- Journaliser les changements et décisions de validation pour audit.


## Intégration Frontend & Simulation

Objectif UI
- Choisir le mode d’exécution (`test` ou `prod`) et lancer un run.
- Afficher le nombre d’exécutions lancées et terminées (compteurs).
- Visualiser, par tentative de nœud, `input`, `args.pre`, `args.post` et `output` (JSON pré/post des fonctions).

Implémentation (livrée dans ce repo)
- Service de simulation: `src/app/services/flow-run.service.ts`
  - API: `run(graph, mode, input)` → crée un `ExecutionRun`, émet la liste des runs (`runs$`) et des compteurs (`counters$`).
  - Stocke par tentative: `argsPre`, `argsPost`, `input`, `result`, `status`, `durationMs`.
  - Compteur par nœud: incrémenté uniquement à la fin (success/error), pas à l’état `running`.
- UI d’exécution: `src/app/features/flow/flow-execution.component.ts`
  - Sélecteur de mode, bouton “Lancer”, compteurs “Lancements/Terminés”.
  - Liste des runs avec statut; panneau de détails listant les tentatives et leurs I/O pré/post.
  - Utilise un graphe de démonstration embarqué; peut être relié au backend plus tard.

Dialog d’édition de nœud — contexte expressions et I/O
- Centre: formulaire args (Dynamic Form) reçoit `ctx` avec:
  - `ctx.input`: valeur d’entrée (résultat du nœud précédent si disponible). Aucune clé `output` n’est injectée côté UI.
- Aile gauche (Input): affiche `ctx.input`; si aucune exécution précédente n’est disponible, affiche un avertissement et propose de lancer le(s) nœud(s) précédent(s).
- Aile droite (Output): affiche le résultat final du flow si connu; sinon la sortie du test du nœud. Les fonctions retournent toujours sous la clé `payload`.

Contrat des fonctions (handlers)
- Signature: `async handler(node, msg, inputs, credentials)` où `credentials` contient les secrets déchiffrés pour ce nœud (ou `null`).
- Un handler retourne un objet “classique” (sans clé imposée). Le moteur remplace le `msg.payload` global par ce résultat pour le nœud suivant.
- Recommandation: structurer l’objet de sortie de manière déterministe et stable (ex: `{ sum: 3, a: 1, b: 2 }`).

Raccordement au backend (quand prêt)
- Remplacer l’appel `FlowRunService.run()` par un POST `POST /api/workspaces/:ws/flows/:id/runs` avec `mode` et `initialInput`.
- Ouvrir un flux SSE/WS sur `GET /api/workspaces/:ws/runs/:id/stream` pour refléter `run.status`, `node.status`, `node.progress`, `node.result`, `node.error`.
- À la fin, appeler `GET /api/workspaces/:ws/runs/:id` pour la synthèse (`finalPayload`, tentatives si exposées) ou consommer en continu si le flux contient tout.

Contrats UI ↔ Backend (rappel)
- Mode: `test|prod` exigé sur la création du run.
- I/O par tentative: exposer `argsPre`, `argsPost`, `input`, `result` pour afficher le JSON pré/post.
- Compteurs: l’UI peut dériver `lancés/terminés` depuis le flux live ou via `GET /api/.../runs?stats=true`.
