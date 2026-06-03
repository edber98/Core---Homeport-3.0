# Exclusion Rules (Parametrage / Admin)

Classer `EXCLUDED` si endpoint concerne principalement:

- API keys, OAuth, tokens, credentials
- Workspace/account/project settings
- User/role/permission administration
- Billing, subscription, invoices
- Webhook setup/secret rotation (sauf reception event deja existante)
- Feature flags, environment toggles
- Internal diagnostics sans action metier

Classer `COVERED` ou `MISSING` si endpoint concerne:

- Donnees metier manipulees dans un workflow
- Execution operationnelle (send, run, search, enrich, sync, transition etat)
- CRUD sur objets metier utiles a l automation
- Bulk operations metier (batch create/update/delete)
