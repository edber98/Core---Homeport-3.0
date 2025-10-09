# Credentials System (Apps/Providers)

Status: frontend-only demo (localStorage); backend-ready spec

## Overview

- Add credentials at the App/Provider level with:
  - `hasCredentials`: provider requires credentials.
  - `allowWithoutCredentials`: nodes may run without credentials.
  - `credentialsForm`: a Dynamic Form schema describing credential fields (supports secret flag).
- Provide a Credentials management page to create/store multiple credential sets per provider and workspace.
- Secret fields are masked in UIs and summaries; values are stored as-is for now (demo).

## Data Model

In `CatalogService`:

- `AppProvider` additions:
  - `hasCredentials?: boolean`
  - `allowWithoutCredentials?: boolean`
  - `credentialsForm?: FormSchema`

- Credential entities:
  - `CredentialSummary = { id, name, providerId, workspaceId }`
  - `CredentialDoc = { id, name, providerId, workspaceId, values }`

Storage keys (localStorage):

- `catalog.credentials` → `CredentialSummary[]`
- `catalog.credential.<id>` → `CredentialDoc`

Export/Import payload (`exportData()` / `importData()`):

```json
{
  "kind": "homeport-catalog",
  "version": 1,
  "apps": [ ... AppProvider ... ],
  "credentials": [ ... CredentialSummary ... ],
  "credentialDocs": { "<id>": ... CredentialDoc ... },
  // existing flows/forms/templates etc.
}
```

## UI/UX

App/Provider Editor (`/apps/editor`):

- Adds two toggles:
  - “Identifiants requis” → `hasCredentials`
  - “Autoriser sans credentials” → `allowWithoutCredentials` (disabled if `hasCredentials = false`).
- When enabled, shows an embedded Dynamic Form Builder to edit `credentialsForm`.
  - Use field “Secret” switch (text/textarea) to mark inputs as secret.

App/Provider Viewer (`/apps/viewer`):

- Displays `hasCredentials` and `allowWithoutCredentials` state.
- Identifiants: single table listing all credentials of the current workspace for this provider.
  - Uses `df-records-table` (columns from the provider’s credentialsForm; first column is the credential name; secret values masked).
  - Icon/brand aligned to the top; block has extra bottom margin and wide min-width with horizontal scroll if needed.

Credentials Page (`/credentials`):

- Filter by Provider; scoped to current workspace (via `AccessControlService`).
- List existing credentials (name, provider, workspace).
- Create dialog (admin-only): select provider, name, and fill the provider’s `credentialsForm` (Dynamic Form).
- Duplicate and delete actions (admin-only).
- Quick viewer (alert) displays values using `DynamicFormService.displayValue`, which masks secret fields as `••••••`.
- Form in modal uses DynamicForm with `hideActions=true` and `disableExpressions=true`.

## Dynamic Form: Secret Fields

- `InputFieldConfig.secret?: boolean` added.
- Renderer (`fields.html`): text inputs render with `type="password"` when `secret = true`.
- Summary/Viewer values (`displayValue`): if `secret` true, return `••••••` regardless of raw value.

## Access Control

- Create/duplicate/delete credentials buttons are disabled for non-admin users (`AccessControlService.currentUser().role`).
- Credentials are tied to `workspaceId` (current workspace) when created.
- Workspaces page supports transfer/duplicate of credentials between workspaces (see below).

## Workspaces: Transfer & Duplicate

- Workspaces page lists transferable elements for the selected workspace: Flows, Forms, Websites, and Credentials.
- Actions per credential:
  - Transférer vers <workspace>: load `CredentialDoc`, set `workspaceId` to target, save.
  - Dupliquer vers <workspace>: load doc, create a copy with new id and name “(copie)”, set target workspace, save.
- Flows keep the existing “templates manquants” guard; credentials transfer doesn’t need template checks.

## Future Backend Contract

- Persist `AppProvider` with the new flags and `credentialsForm`.
- CRUD for credentials scoped by `workspaceId` and `providerId`.
- Secrets handling:
  - At minimum: never return secret plaintext in list endpoints.
  - Consider write-only or envelope encryption for secret fields.
  - Support duplication/transfer semantics (server-side masking and re-entry flows).

## Integration with Nodes (next phase)

- Nodes referencing a provider should enforce:
  - If provider `hasCredentials=true` and node is not explicitly allowed without credentials, require a credential selection bound to current workspace.
  - If `allowWithoutCredentials=true`, permit bypass with an explicit node option.
  - Validation should block execution when required credentials are missing.
