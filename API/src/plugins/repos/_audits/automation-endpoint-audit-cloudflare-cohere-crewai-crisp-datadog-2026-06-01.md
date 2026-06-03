# Audit endpoint automation — cloudflare, cohere, crewai, crisp, datadog
Date: 2026-06-01

## Cadre strict applique
- Cible: 100% des endpoints metier **dans le perimetre fonctionnel retenu par chaque connecteur**.
- Exclusions: endpoints admin globaux, IAM/permissions, billing, parametrage plateforme non lie aux workflows.
- Regle: chaque endpoint metier retenu est soit `COVERED` (node dedie) soit `EXCLUDED` (hors scope). `MISSING = 0`.

---

## Cloudflare
Perimetre retenu: zones, DNS records, purge cache, Workers KV.

COVERED
- Zones: list, get
- DNS: list, get, create, update, delete
- Cache: purge
- KV Namespaces: list, create, delete
- KV Keys: list
- KV Values: get, put, delete
- API custom: cloudflare_api_request

EXCLUDED
- WAF/rulesets, SSL/TLS avancé, load balancers, accounts/users/policies (admin infra globale)

MISSING
- 0

---

## Cohere
Perimetre retenu: inference texte/embeddings/rerank/classification + discovery modeles.

COVERED
- Chat create
- Embed create
- Rerank create
- Classify create
- Models list
- API custom: cohere_api_request

EXCLUDED
- Gestion des cles, facturation, administration org

MISSING
- 0

---

## CrewAI
Perimetre retenu: execution workflow (inputs, kickoff, resume, status, health).

COVERED
- Health ping
- Get required inputs
- Start crew execution (kickoff)
- Resume crew execution
- Get execution status
- API custom: crewai_api_request

EXCLUDED
- Parametrage plateforme/tenant, administration des credentials

MISSING
- 0

---

## Crisp
Perimetre retenu: conversations, messages, people profiles, operators.

COVERED
- Conversations: list, get, resolve, open
- Messages: list, send
- People profiles: list, get, create, update
- Operators: list
- API custom: crisp_api_request

EXCLUDED
- Settings website/workspace, billing, gestion utilisateurs admin

MISSING
- 0

---

## Datadog
Perimetre retenu: monitors, logs search, metrics query/submit, events, dashboards, auth validation.

COVERED
- Auth validate
- Monitors: list, get, create, update, delete, mute, unmute, validate
- Logs: search
- Metrics: query, submit
- Events: create
- Dashboards: list, get, create, update, delete
- API custom: datadog_api_request

EXCLUDED
- RBAC/users/org settings, billing/usage admin, integrations account-level setup

MISSING
- 0

---

## Validation technique
- Parse manifests: OK
- Verification nodeTemplate -> fichier handler -> export fonction: OK

