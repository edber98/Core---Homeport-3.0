Plugins — État, couverture et progression

Résumé
- Architecture: plugins sous `API/src/plugins/{local|repos}/*` avec `manifest.json` (Providers + NodeTemplates) et handlers `functions/*.js`.
- Import: au démarrage et via `/api/plugins/reload`, les manifests sont importés (Providers/NodeTemplates en base) et les handlers enregistrés.
- Exécution: l’engine appelle `registry.resolve(<template_key>)` avec `inputs` (args compilés) et `opts.credentials` (secrets déchiffrés).

Statut par repo
- core
  - Providers: `core`, `mqtt` (form credentials défini)
  - Nodes: utilitaires HTTP/transform/validator + triggers (webhook/scheduler/mqtt/ws/socketio)
  - Handlers réels: `core_http_request` (appel simulé), `core_transform` (réel — transformation locale), `core_validator` (réel — Ajv)
  - Manquants/à câbler: `core_webhook`, `core_scheduler`, `mqtt_publish`, `mqtt_subscribe`, `ws_event`, `socketio_event`
  - Note: décider si ces triggers sont purement déclaratifs (routes/WS dédiés côté API) ou s’ils doivent avoir un handler minimal.

- calendars (Google/Outlook)
  - Providers: `googleCalendar`, `outlookCalendar` (OAuth forms)
  - Handlers: présents (actuellement placeholders/simulés pour create/update/RSVP/webhook)
  - Prochaines étapes: implémenter appels réels Google Calendar API / Microsoft Graph; sécuriser webhook signature.

- email
  - Providers: `smtp_imap`, `gmail`, `outlook` (forms complets)
  - Handlers: `email_send` (réel via Nodemailer), `email_read`/`email_new_message`/`email_list_labels`/`email_add_label`/`email_remove_label` (actuels placeholders)
  - Prochaines étapes: IMAP réel (lecture), Gmail labels via Google API; conserver la même méthode credentials que `email_send` (opts.credentials).

- github
  - Provider: `github`
  - Handlers: placeholders (`issue_create`, `comment`)
  - Prochaines étapes: GitHub REST v3 (octokit), auth via token provider.

- google-drive
  - Providers: `googleDrive`, `googleDocs`, `googleSheets`
  - Handlers: placeholders (upload/share/docs/sheets)
  - Prochaines étapes: Drive/Docs/Sheets API réelles, OAuth.

- google-chat / microsoft-teams / slack / zoom / nextcloud / onedrive-sharepoint
  - Providers & Nodes: définis avec forms
  - Handlers: présents mais majoritairement placeholders (post/message/upload/webhooks)
  - Prochaines étapes: brancher APIs réelles (SDK officiels ou REST), sécuriser credentials.

- openai (NOUVEAU)
  - Provider: `openai` (apiKey, baseUrl, organization, defaultModel) — réel
  - Nodes: `openai_chat_completion`, `openai_embeddings`, `openai_image_generate` — tous RÉELS (client officiel OpenAI)
  - Dossier: `API/src/plugins/repos/openai` (auto‑import au reload)

Réel vs Simulation
- Réel: `email_send` (SMTP via Nodemailer), `openai_*` (chat/embeddings/images), `core_validator` (validation Ajv), `core_transform` (transfo locale)
- Simulation/placeholders: la majorité des autres handlers actuellement (calendars, chat d’équipe, stockage, etc.)

Credentials — Format (Form Builder)
- Chaque Provider définit `credentialsForm` avec `fields` (type, key, label, col, validators, secret…).
- À l’exécution, les valeurs déchiffrées sont injectées en `opts.credentials` vers le handler.
- Exemples:
  - OpenAI: `apiKey` (secret, requis), `baseUrl` (optionnel), `organization` (optionnel), `defaultModel` (texte)
  - SMTP/IMAP: `smtpHost`, `smtpPort`, `smtpSecure`, `username`, `password`, … (déjà en place)

Import & Reload
- Built‑in repos (`local`, `repos`) scannés par le `registry` → import auto des manifests + enregistrement des handlers.
- Repos Git externes supportés via `PLUGIN_REPOS` (CSV/JSON); clonés au boot, puis reload.

Feuille de route (proposée)
- AI: finaliser OpenAI (fait), ajouter Anthropic/AzureOpenAI/Vertex (schemas similaires), ajouter tests de nœuds via `/api/flows/:id/test-node`.
- Communications: Slack/Teams/Google Chat (réel), webhooks entrants sécurisés (signature/secret).
- Calendriers/Drive: implémentations OAuth production (tokens en credentials), appels réels.
- Core triggers: définir la stratégie (handlers vs modules serveurs) et implémenter.

