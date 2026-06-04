---
name: kinn-connector-creator
description: 'Create or extend Kinn/Homeport workflow builder connectors in API/src/plugins/repos. Use when asked in French or English to create a connector from an extracted or filtered endpoints JSON, or to add a provider, integration, actions, triggers, or endpoints in Kinn. Enforces the Notion-style connector structure, one handler file per action, explicit body fields, preserved path/query/header inputs, complete output schemas, and validation.'
---

# Kinn Connector Creator

Use this skill when the user asks things like:

- "Ajoute le connecteur HubSpot dans Kinn"
- "Crée l'intégration Linear"
- "Add a connector for X"
- "Ajoute les endpoints utiles de X au workflow builder"

The target is always a workflow-builder connector under:

```text
API/src/plugins/repos/{connector}/
├── manifest.json
└── functions/
    ├── utils.js
    ├── {connector}-{resource}-{action}.js
    └── ...
```

Prefer the Notion connector style, not the GitLab monolithic style:

- one handler file per action;
- one shared `functions/utils.js`;
- manifest ordered as `repo`, `variables`, `providers`, `nodeTemplates`;
- every payload output references a `$var:` schema;
- every non-event `nodeTemplate.key` has a matching JS handler export.

## Required Workflow

1. Inspect existing connector conventions before editing:
   - `API/src/plugins/repos/notion/manifest.json`
   - `API/src/plugins/repos/notion/functions/utils.js`
   - several Notion action files
   - a broad connector like `gitlab` only to understand endpoint coverage and resource grouping.
2. Research the target API from official/current docs when endpoint details are not already provided. Keep source notes in your reasoning, but do not paste large docs into the repo.
3. Build a coverage inventory before editing:
   - primary workflow objects;
   - lifecycle actions for each object;
   - workflow-specific actions such as send, comment, assign, tag, move, trigger, search, crawl, transcribe, generate, embed, deploy, query, or upsert;
   - incoming webhook/event surfaces;
   - intentionally excluded surfaces with a short reason.
4. Implement complete useful automation coverage from that inventory. Do not mirror the entire public API, but do not stop at a thin starter subset when obvious workflow actions exist.
   - Mandatory rule: include **all** documented, stable functions that can be useful in real automations, including less-frequent or niche actions when they provide concrete workflow value.
5. Create or update `API/src/plugins/repos/{connector}` using the Notion-style file layout.
6. Implement `manifest.json`, `functions/utils.js`, and one handler file per action.
7. Ensure connector branding is set: add/fix the logo using the dedicated `kinn-connector-logo` skill (including `iconUrl`, `color`, and `iconClass` consistency in the manifest).
8. Run the validation script bundled with this skill:

```bash
node .agents/skills/kinn-connector-creator/scripts/check-connector.js {connector}
```

9. Run any relevant project tests or import checks available locally. If none exist, state that validation was limited to static checks.
10. In the final answer, state the coverage level honestly: list the resource groups implemented and call out useful automation surfaces intentionally left out because they are unsafe, admin-only, duplicative, unsupported by docs, or requested for a later pass.

### Fast path (preferred)

Quand un JSON d endpoints filtre est disponible, utiliser ce pipeline en priorite:

```bash
# 1) Convertir l inventaire JSON filtre en spec exploitable par le generateur
node .agents/skills/kinn-connector-creator/scripts/generate-spec-from-endpoints-json.js \
  <api-name>-automation-endpoints.json \
  --connector <connector> \
  --provider-name "Provider Name"

# 2) Generer les actions du connecteur a partir de cette spec
node .agents/skills/kinn-connector-creator/scripts/generate-actions-from-spec.js \
  <connector> \
  --spec .agents/skills/kinn-connector-creator/tmp/<connector>.from-endpoints.spec.json \
  --force
```

Puis:

```bash
node .agents/skills/kinn-connector-creator/scripts/check-connector.js <connector>
```

Quand seule la spec OpenAPI brute est disponible, utiliser le pipeline OpenAPI direct existant:

```bash
# 1) Build exhaustive automation spec from OpenAPI
node .agents/skills/kinn-connector-creator/scripts/generate-spec-from-openapi.js \
  <openapi.json|url> \
  --connector <connector> \
  --provider-name "Provider Name"

# 2) Create connector + actions + logo + validation
node .agents/skills/kinn-connector-creator/scripts/mass-create-connectors.js <inventory.json>
```

Use `strictAutomation` (default true) to block thin connectors.

## JSON d entree attendu

Le JSON d entree venant du skill precedent doit contenir:

- `api`
- `endpoint_count`
- `endpoints[]`
- pour chaque endpoint: `method`, `path`, `parameters`, et `request_body` si l endpoint a un body documente

Le creator doit repartir de ce JSON filtre, pas refaire une selection arbitraire d endpoints.

## Coverage Gate (Mandatory)

Before considering a connector "done", run this explicit gate:

1. Build a checklist of all documented, stable, automation-useful actions per resource.
2. Map each checklist action to either:
   - an implemented node key + handler file, or
   - a documented exclusion reason (unsafe/admin-only/non-workflow/duplicate/unsupported).
3. If any checklist action is neither implemented nor explicitly excluded, the connector is **not complete**.
4. Starter/minimal subsets are forbidden when obvious workflow actions exist for the provider.
5. In the final report, include a short "missing useful actions: none" line or list remaining gaps.
6. Prefer OpenAPI-driven endpoint selection; manual hand-picking is fallback only.

## Bulk / Scale Workflow (for many connectors)

When the request targets many connectors (dozens, hundreds, thousands), use the bundled scripts first, then complete each connector with full automation coverage:

1. Scaffold one connector quickly:

```bash
node .agents/skills/kinn-connector-creator/scripts/scaffold-connector.js <connector> \
  --provider-name "Provider Name" \
  --icon-url "https://cdn.simpleicons.org/provider" \
  --icon-class "fa-solid fa-puzzle-piece" \
  --color "#f2f2f2"
```

2. Scaffold many connectors from an inventory file (`.json` or `.jsonl`):

```bash
node .agents/skills/kinn-connector-creator/scripts/bulk-scaffold-connectors.js <inventory.json> --dry-run
node .agents/skills/kinn-connector-creator/scripts/bulk-scaffold-connectors.js <inventory.json> --continue-on-error
```

3. Use the generated skeletons as a base only, then implement the full action inventory for each provider (do not ship placeholder-only connectors).
4. Run connector validation per connector after filling real nodes:

```bash
node .agents/skills/kinn-connector-creator/scripts/check-connector.js <connector>
```

Reference inventory sample:

- [references/bulk-inventory.example.json](references/bulk-inventory.example.json)

## Bulk Scripts Catalog

Use these scripts to industrialize connector creation at high volume:

1. `scaffold-connector.js`: create one connector skeleton (`manifest.json`, `functions/utils.js`, sample node).
2. `bulk-scaffold-connectors.js`: scaffold many connectors from `.json` or `.jsonl`.
3. `generate-actions-from-spec.js`: generate manifest `nodeTemplates`, output schemas, and one handler file per action from a resource/action spec.
4. `generate-spec-from-openapi.js`: auto-select stable automation-useful endpoints from OpenAPI JSON and build a full action spec.
5. `bulk-generate-actions.js`: run action generation for many connectors in one pass.
6. `bulk-apply-logos.js`: apply logo branding for many connectors via the dedicated logo skill script.
7. `bulk-check-connectors.js`: run static connector validation in batch.
8. `mass-create-connectors.js`: orchestrate scaffold + actions + logo + validation in one command (supports `openapiFile` inventory entries).

### Typical high-volume pipeline

```bash
# 1) Dry run full pipeline
node .agents/skills/kinn-connector-creator/scripts/mass-create-connectors.js \
  .agents/skills/kinn-connector-creator/references/mass-inventory.example.json \
  --dry-run

# 2) Execute generation in batch, keep going on individual failures
node .agents/skills/kinn-connector-creator/scripts/mass-create-connectors.js \
  .agents/skills/kinn-connector-creator/references/mass-inventory.example.json \
  --continue-on-error

# 3) Re-check all generated connectors listed in inventory
node .agents/skills/kinn-connector-creator/scripts/bulk-check-connectors.js \
  .agents/skills/kinn-connector-creator/references/mass-inventory.example.json \
  --continue-on-error
```

### Spec and inventory examples

- [references/action-spec.example.json](references/action-spec.example.json)
- [references/bulk-actions-inventory.example.json](references/bulk-actions-inventory.example.json)
- [references/mass-inventory.example.json](references/mass-inventory.example.json)

Important: generated connectors are accelerators, not final coverage guarantees. You must still complete all stable automation-useful endpoints before considering a connector done.

## What Counts as Useful

Include every documented, stable node that a workflow builder user can realistically combine with other steps:

- list/search/get records;
- create/update/delete/archive/restore records;
- send messages, comments, notes, emails, notifications;
- upload/download/list files when file handling is supported;
- trigger/webhook event nodes when the API supports incoming events;
- relationship actions that unlock automation, such as assigning, linking, moving, tagging, changing status.
- provider-specific automation verbs, such as run, crawl, scrape, extract, generate, transcribe, synthesize, deploy, upsert, query, rerank, embed, monitor, alert, or trigger, when those are central to the product.

Coverage should be complete for the useful surface of the provider, not merely representative. For a connector with central objects like issues, contacts, projects, tasks, files, runs, deployments, transcripts, vectors, or messages, include the supported lifecycle and action nodes users would naturally expect in workflows.

For analytics providers specifically (Mixpanel, PostHog, Amplitude-like), "useful surface" includes at minimum:

- event capture/import and identity aliasing;
- profile lifecycle and mutation operators (`set`, `unset`, `delete`, `increment`, list add/remove/union-style operations);
- group lifecycle and mutation operators (set/unset/remove/delete when available);
- monetization-related profile helpers (charges/transactions) when documented and stable;
- query/report nodes that are workflow-usable (segmentation variants, funnels, retention, profile query), with date windows and filtering inputs.

Do not skip a stable automation-useful function only because it is "not common". If it can unlock a realistic workflow, include it.

Usually exclude:

- admin-only settings and org governance;
- billing, invoices for the SaaS account itself, plan management;
- analytics dashboards that are only human reporting unless they produce workflow data;
- duplicate aliases around the same behavior;
- low-level endpoints that require too much provider-specific context to be useful as a generic node;
- destructive bulk operations unless there is a clear workflow use case and guarded inputs.

Read [references/endpoint-selection.md](references/endpoint-selection.md) for the selection rubric.

## Implementation Rules

- Use French UI text with accents in `title`, `subtitle`, `label`, `description`, group names, and credential titles.
- In `manifest.json`, every `nodeTemplates[].title` and `nodeTemplates[].args.title` must be in French.
- For `nodeTemplates[].description`, do not write generic phrasing like "Execute/Appelle l endpoint ...". Describe the concrete business action in French (for example: "Recupere la liste des factures", "Met a jour un contact", "Supprime une ligne de commande").
- For a given `providerKey`, each node must have a distinct `name` and a distinct `title` (no duplicates).
- Use `snake_case` keys prefixed by provider: `{provider}_{resource}_{action}`.
- Use `camelCase` `name`.
- Use `schemaVersion: 2`.
- Use `type: "function"` and `nodeKind: "function"` for actions.
- Use `type: "event"` and `nodeKind: "event"` for incoming webhook triggers.
- Use `authorize_catch_error: true` for API actions unless the connector already consistently uses `authorize_skip_error`.
- Keep handler returns stable and small; map API responses into predictable fields instead of returning huge raw objects by default.
- Include pagination inputs on list/search nodes: usually `pageSize`/`per_page`, cursor/page when supported.
- For JSON-heavy provider features, use `json` or `textarea` args and validate JSON in the handler with clear errors.
- Ne jamais exposer un unique champ générique `body`, `payload`, `payloadJson`, `data`, `attributes`, `requestAttributes`, `requestRootKey` ou `requestResourceId` pour un endpoint `POST`/`PATCH`/`PUT`.
- Pour chaque endpoint avec request body, créer un champ par attribut accepté par l endpoint, y compris pour les objets imbriqués: chaque feuille doit devenir un champ dédié avec une clé stable en `snake_case` dérivée de son chemin dans le body.
- Les paramètres `header` documentés dans le JSON source doivent rester exposés comme champs explicites et être transmis comme headers HTTP dans le handler généré.
- Les objets imbriqués doivent être reconstruits automatiquement dans le handler via leur chemin `bodyPath`. Les tableaux ou objets réellement libres peuvent rester un champ `json`, mais seulement pour cet attribut précis, jamais pour tout le body.
- Les labels de champs générés doivent être en français compréhensible pour un utilisateur métier. Interdiction d’exposer des libellés techniques bruts du type `Accountcustomfielddatum Customeraccountid`, `Dealstage Cardregion1` ou `Ecomorder Externalid`.
- Les descriptions de champs générés doivent elles aussi être en français. Ne jamais laisser une description brute issue de la doc en anglais si le champ est exposé dans l’UI.
- Quand un champ est généré automatiquement depuis une spec, relire et corriger manuellement les labels/descriptions avant de considérer le connecteur terminé. Un champ comme `customDomains`, `frequency_penalty`, `MergedToContactID` ou `commitAuthorEmail` doit devenir un libellé français naturel, pas une translittération technique.
- Pour les champs d’un objet racine déjà implicite dans le noeud (par exemple une adresse dans un noeud "Créer une adresse"), ne pas répéter inutilement le contexte dans chaque label: préférer `Nom de l’entreprise`, `Adresse ligne 1`, `Ville`, et non `Nom de l’entreprise de l’adresse`, `Adresse ligne 1 de l’adresse`, `Ville de l’adresse`.
- Si le schéma du body n est pas suffisamment connu pour faire ce mapping attribut par attribut correctement, arrêter la génération et compléter le mapping avant de produire le connecteur.
- Never access `node.args`; use `inputs`.
- Credentials live in `opts.credentials`.
- Progress logs use `opts.log`, with short French messages.

## References

Load only what you need:

- [references/structure.md](references/structure.md): exact directory and file conventions.
- [references/endpoint-selection.md](references/endpoint-selection.md): how to decide which endpoints to keep.
- [references/manifest-patterns.md](references/manifest-patterns.md): manifest, provider, variable, and node template patterns.
- [references/handler-patterns.md](references/handler-patterns.md): `utils.js` and per-action handler patterns.
- [references/validation.md](references/validation.md): checks before handing off the connector.
- `scripts/generate-spec-from-endpoints-json.js`: conversion inventaire endpoints filtre -> spec du generateur.
