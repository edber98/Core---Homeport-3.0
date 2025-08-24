# Accès, Rôles et Workspaces — Simulation Front

Date: 2025-08-24

Ce document décrit le système de gestion des droits (RBAC) et de workspaces implémenté côté front (Angular) pour la simulation des accès aux contenus Flows, Forms et Websites.

## Concepts

- Rôle: `admin` ou `member`.
  - `admin`: accès global à tous les workspaces et à tous les contenus; peut gérer les utilisateurs, les workspaces, et l’allowlist des templates de nœuds par workspace.
  - `member`: accès restreint à un sous-ensemble de workspaces, défini par l’admin.
- Workspace: espace logique auquel sont rattachés les contenus (flows, forms, websites).
- Mapping Ressource→Workspace: chaque flow/form/website est associé à un workspace.
- Allowlist de templates: par workspace, l’admin peut autoriser/interdire des templates de nœuds.

Toutes les données sont persistées dans `localStorage` (simulation). Aucune API backend n’est requise.

## Service principal

- Fichier: `src/app/services/access-control.service.ts`
- Expose:
  - `users()` et `workspaces()` via Angular signals.
  - `currentUser()` et `currentWorkspace()` (signals), `currentWorkspaceId()` (string).
  - `setCurrentUser(id)`, `setCurrentWorkspace(id)`.
  - `canAccessWorkspace(wsId)` — calcule l’accès selon le rôle et l’appartenance du user.
  - Mapping: `setResourceWorkspace(kind, id, wsId)` + `ensureResourceWorkspace(kind, id)`.
  - Allowlist templates: `listAllowedTemplates(wsId)`, `setAllowedTemplates(wsId, ids)`, `toggleTemplate(wsId, tplId, on)`.
  - `changes$`: Observable émis à chaque changement de user/workspace pour rafraîchir les vues.

### Seed / Données par défaut

- Workspaces: `default`, `marketing`.
- Utilisateurs: `admin` (admin), `alice` (member de `default`).
- Mapping des contenus existants: si aucun mapping présent en storage, une distribution deterministe est appliquée en alternant les workspaces selon un hash de l’`id` (répartition visible immédiatement pour constater les droits).

## UI — Sélecteurs dans la Header Bar

- Fichier: `src/app/layout/layout-main/layout-main.html/.ts`
- Sélecteur d’utilisateur actif (toujours visible) et sélecteur de workspace (limité aux workspaces accessibles par l’utilisateur courant).
- Le menu latéral masque automatiquement les entrées admin-only (Workspaces, Users, Node Templates) pour les non-admins.

## Vues ajoutées

- Workspaces (`/workspaces`):
  - Liste et création de workspaces.
  - Éditeur d’autorisations: allowlist des templates par workspace (checkboxes).
- Users (`/users`):
  - Création d’utilisateurs (nom, rôle, workspaces attribués pour `member`).
  - Edition inline du rôle et des workspaces d’un utilisateur.

## Filtrage des contenus

- Fichiers:
  - Flows: `src/app/features/flow/flow-list.component.ts`
  - Forms: `src/app/features/dynamic-form/form-list.component.ts`
  - Websites: `src/app/features/website/website-list.component.ts`
- Règles:
  - Chaque liste s’assure qu’un mapping existe (`ensureResourceWorkspace`).
  - Les éléments sont affichés uniquement si:
    - `resource.workspace === currentWorkspaceId()` ET
    - `canAccessWorkspace(resource.workspace)` pour l’utilisateur courant.
  - Sur changement d’utilisateur ou de workspace, les listes se rechargent automatiquement (abonnement à `acl.changes$`).

## Création de contenus

- Lors de la création d’un Flow / Form, le contenu est automatiquement rattaché au workspace actuellement sélectionné.

## Templates de nœuds

- L’allowlist par workspace est gérée dans la vue Workspaces.
- L’intégration effective dans le Flow Builder (masquer les templates non autorisés) peut utiliser cette allowlist via `AccessControlService.listAllowedTemplates(currentWorkspaceId)`.

## Extension et intégration backend

- Le service ACL simule un backend via `localStorage`. Pour une intégration réelle:
  - Remplacer les lectures/écritures par des appels HTTP.
  - Déporter la logique de seed côté backend.
  - Synchroniser le mapping Ressource→Workspace au moment des `create`/`update`.

## Limitations connues

- Pas de guard de route; la sécurité est uniquement côté UI.
- Le mapping initial (seed) peut répartir arbitrairement des contenus existants.
- La gestion des droits ne couvre pas encore la granularité par action (ex: read vs write) — possible extension: `permissions: { flows: 'rw'|'r', ... }`.

