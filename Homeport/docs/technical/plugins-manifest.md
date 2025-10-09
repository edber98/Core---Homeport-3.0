Plugins Manifest & Repo Structure

Goal
- Dynamically import providers/apps and node templates into the backend and register function handlers executed by the flow engine.

Repo Structure
- Each repo folder under backend/src/plugins/local/* or backend/src/plugins/repos/* has:
  - manifest.json: describes providers and nodeTemplates with full UI metadata.
  - functions/*.js: CommonJS files exporting handler functions for templates.

Manifest Schema (summary)
- providers: [ { key, name, title?, iconClass?, iconUrl?, color?, tags?, categories?, enabled?, hasCredentials?, allowWithoutCredentials?, credentialsForm? } ]
- nodeTemplates: [ { key, name, title?, subtitle?, icon?, description?, tags?, group?, type, category?, providerKey?, appName?, args?, output?, authorize_catch_error?, authorize_skip_error?, allowWithoutCredentials?, output_array_field? } ]
- On import, checksums are computed for idempotent upsert:
  - Provider.checksum over UI + credential flags/form
- NodeTemplate.checksumArgs (based on args) and checksumFeature (authorize flags, output, allowWithoutCredentials, output_array_field)

Handlers
- Each functions/*.js file should export:
  - Option A (single):
    - exports.key = '<template_key>'
    - exports.run = async (node, msg, inputs) => ({ ... })
  - Option B (multiple in one file):
    - module.exports = { keyA(node,msg,inputs){...}, keyB(node,msg,inputs){...} }
    - or module.exports = { handlers: { keyA: fn, keyB: fn } }
- The engine resolves template keys from nodes (normalizing 'tmpl_*' prefixes) and executes the registered handler. Multiple repos can coexist; latest reload picks up new/updated handlers.

Import Mechanism
- On startup and on POST /api/plugins/reload, the registry scans repos, imports manifest.json (upsert in Mongo), and registers handlers.
- Manual upsert: POST /api/plugins/import-manifest with raw manifest body.

 Linking to Apps/Providers
- NodeTemplate.providerKey and .appName link templates to providers/apps. Use the same values as frontend (e.g., appId in CatalogService → appName). NodeTemplate.args préserve le schéma UI (form builder) du frontend.

Examples
- See:
  - backend/src/plugins/local/demo/manifest.json and functions (demo set aligned with frontend)
  - backend/src/plugins/repos/github (simulated external repo) with a multi-handler file at functions/functions.js
  - backend/src/plugins/local/crm (another local plugin with UI args forms in manifest and multi-handler file)
