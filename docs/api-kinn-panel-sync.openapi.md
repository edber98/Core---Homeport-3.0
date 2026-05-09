# Kinn ↔ Kinn-panel — API de synchronisation

Ce document décrit l'API qu'**une instance Kinn déployée** expose pour que **Kinn-panel** puisse :
- Provisionner / synchroniser les users (création JIT côté SSO + push manuel)
- Synchroniser les workspaces, leurs membres et les rôles
- Invalider les sessions actives quand un grant Zitadel est révoqué
- Configurer le SSO (vars d'env injectées au déploiement, doc-only)

L'OpenAPI 3.1 brut est embarqué dans la dernière section pour Swagger UI / codegen.

---

## 1. Modèle conceptuel

```
Zitadel (IDP — source de vérité auth)
    │
    │ ID token claims (admin/editor/viewer + kinn_client_id + kinn_groups)
    ▼
Kinn (cette API) ◄────── Kinn-panel ──────► Zitadel Management API
    ▲                       │
    │ webhook HMAC           │ provisionne au déploiement
    │ /internal/*           │ (org, project, roles, OIDC client)
    └───────────────────────┘
```

- **Kinn** ne parle JAMAIS à Zitadel pour gérer des users/orgs. Il consomme uniquement OIDC.
- **Kinn-panel** est l'orchestrateur : il manipule Zitadel via son Management API, et appelle Kinn pour syncer le state local (workspaces, membres, sessions).
- L'utilisateur final passe par Kinn (ou un autre app déployée par Kinn-panel) pour s'authentifier.

---

## 2. Authentification

Trois schémas :

### 2.1 Bearer JWT (admin)

Token émis par `/api/auth/login` ou `/api/auth/sso/callback`. Doit avoir `role: 'admin'`. Header :
```
Authorization: Bearer <jwt>
```

### 2.2 Bearer PAT (compte machine)

Personal Access Token créé via `/api/me/pats` (préfixe `kpat_`). Recommandé pour Kinn-panel :
1. Au déploiement, Kinn-panel se logge avec un compte admin (ou crée un compte `kinn-panel@<client>.local` avec `bypassSSO: true`)
2. Génère un PAT pour ce compte via l'API
3. Stocke le PAT chiffré côté Kinn-panel
4. Tous les appels suivants utilisent ce PAT

```
Authorization: Bearer kpat_<random>
```

### 2.3 HMAC SHA-256 (webhooks /internal/*)

Pour les push events Kinn-panel → Kinn (révocation, sync forcée). Header :
```
X-Kinn-Panel-Signature: sha256=<hex(hmac(KINN_PANEL_HMAC_SECRET, body))>
Content-Type: application/json
```

Le secret est posé en env `KINN_PANEL_HMAC_SECRET` au déploiement. Mêmes deux côtés.

---

## 3. Endpoints (résumé)

| Méthode | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/auth/sso/status` | public | État SSO (mode, enabled) |
| GET | `/api/auth/sso/start` | public | Redirect vers Zitadel |
| GET | `/api/auth/sso/callback` | public | Callback OIDC |
| POST | `/api/auth/sso/refresh` | session | Refresh access token via refresh token |
| GET | `/api/auth/sso/logout` | session | RP-initiated logout |
| GET | `/api/me` | JWT/PAT | Profil + workspaces du user courant |
| GET | `/api/me/pats` | JWT/PAT | Liste des PAT du user |
| POST | `/api/me/pats` | JWT/PAT | Crée un PAT (réponse contient le clair une seule fois) |
| DELETE | `/api/me/pats/:id` | JWT/PAT | Révoque un PAT |
| GET | `/api/users` | JWT/PAT | Liste paginée des users de la company |
| GET | `/api/users/:id` | JWT/PAT | Détails d'un user (incl. workspaces) |
| POST | `/api/users` | admin | Crée un user local (rare en mode SSO) |
| PUT | `/api/users/:id` | admin | Modifie role + memberships d'un user |
| GET | `/api/workspaces/:wsId/members` | JWT/PAT | Liste des membres d'un workspace |
| POST | `/api/workspaces/:wsId/members` | admin | Ajoute un membre |
| PATCH | `/api/workspaces/:wsId/members/:userId` | admin | Change le rôle dans le workspace |
| DELETE | `/api/workspaces/:wsId/members/:userId` | admin | Retire un membre |
| POST | `/api/workspaces` | admin | Crée un workspace |
| PUT | `/api/workspaces/:wsId` | admin | Modifie un workspace |
| DELETE | `/api/workspaces/:wsId` | admin | Supprime un workspace |
| POST | `/internal/auth/invalidate-session` | HMAC | Invalide toutes les sessions actives d'un user (push révocation Zitadel) |

---

## 4. Cas d'usage Kinn-panel

### 4.1 Provisioning d'une nouvelle company

À la création d'un nouveau client en Kinn-panel :

1. **Kinn-panel** crée l'org + project Zitadel, OIDC app, project roles `admin/editor/viewer`.
2. Déploie l'instance Kinn (Helm) avec env vars `ZITADEL_*` + `KINN_PANEL_HMAC_SECRET`.
3. Le seed Kinn (au boot) crée la Company + workspace par défaut + un user `system@<client>.local` avec `bypassSSO: true` et un mot de passe random.
4. Kinn-panel se logge avec ces credentials, crée un PAT (`POST /api/me/pats`), et stocke le PAT.
5. Kinn-panel set en Zitadel User Metadata sur l'admin client : `kinn_client_id` (le `_id` de la Company Kinn), `kinn_kind: 'client_user'`.
6. L'admin client se logge → JIT crée son User Kinn → role `admin` (via project role Zitadel) → attaché au workspace par défaut.

### 4.2 Sync d'un nouveau workspace

Quand l'admin client crée un workspace dans Kinn UI :
- Aucun appel à Kinn-panel nécessaire (workspaces purement Kinn-DB en niveau 1).
- Kinn-panel peut **observer** via `GET /api/workspaces` s'il veut tracker.

### 4.3 Sync membre quand Zitadel grant change

Quand un admin Kinn-panel **révoque** un grant Zitadel sur un user :
1. Kinn-panel envoie `POST /internal/auth/invalidate-session { userId, reason }` signé HMAC.
2. Kinn bump `User.sessionVersion` → tous les JWT actifs deviennent invalides (au prochain request).
3. Au prochain login SSO du user, son rôle est re-synced depuis Zitadel claims (donc s'il n'a plus de project role, il fallback `viewer` ou login refusé selon `SSO_ROLE_MAP`).

### 4.4 Sync forcée d'un workspace membership

Si Kinn-panel veut imposer qu'un user soit membre d'un workspace immédiatement (sans attendre un re-login) :

```bash
# 1. Récupère ou crée le user
GET /api/users?q=alice@acme.com

# 2. Ajoute-le au workspace (rôle: 'admin' | 'editor' | 'viewer')
POST /api/workspaces/{wsId}/members
{
  "email": "alice@acme.com",
  "role": "editor"
}
```

---

## 5. Spec OpenAPI 3.1 (YAML)

Copie ce bloc dans `swagger.yaml` ou `openapi.yaml` pour le donner à Swagger UI / Postman / un codegen.

```yaml
openapi: 3.1.0
info:
  title: Kinn ↔ Kinn-panel sync API
  version: '1.0.0'
  description: |
    API de synchronisation users/workspaces/memberships/SSO entre une instance Kinn
    déployée et Kinn-panel. Voir api-kinn-panel-sync.openapi.md pour la doc complète.
  contact:
    name: Kinn
    email: edouard.bernier@me.com

servers:
  - url: https://{kinn-host}
    description: Instance Kinn déployée
    variables:
      kinn-host:
        default: kinn.example.com

security:
  - BearerJwt: []
  - BearerPat: []

components:
  securitySchemes:
    BearerJwt:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT interne Kinn (issu de /api/auth/login ou /api/auth/sso/callback)
    BearerPat:
      type: http
      scheme: bearer
      bearerFormat: kpat_xxx
      description: Personal Access Token (préfixe kpat_) créé via /api/me/pats
    KinnPanelHmac:
      type: apiKey
      in: header
      name: X-Kinn-Panel-Signature
      description: |
        Signature HMAC-SHA256 hex du body avec KINN_PANEL_HMAC_SECRET.
        Format: "sha256=<hex>".

  schemas:
    Envelope:
      type: object
      required: [success]
      properties:
        success: { type: boolean }
        data: {}
        error:
          type: object
          properties:
            code: { type: string }
            message: { type: string }
            details: {}
        requestId: { type: string }
        ts: { type: integer, format: int64 }

    User:
      type: object
      properties:
        id: { type: string, description: ObjectId Mongo Kinn }
        email: { type: string, format: email }
        name: { type: string }
        role:
          type: string
          enum: [admin, editor, viewer]
          description: |
            Rôle effectif (localPromotion override role synced de Zitadel).
        zitadelSub: { type: string, nullable: true }
        kind:
          type: string
          example: client_user
          description: Tag Zitadel User Metadata (kinn_kind), libre. Défaut 'client_user'.
        groups:
          type: array
          items: { type: string }
          description: Tags Zitadel User Metadata (kinn_groups). Stocké, sans logique dérivée pour l'instant.
        bypassSSO:
          type: boolean
          description: Si true, peut login email/pwd même en SSO_MODE=enforced (compte break-glass).
        sessionVersion:
          type: integer
          description: Bumpé pour invalider toutes les sessions actives du user.
        companyId: { type: string }
        defaultWorkspaceId: { type: string, nullable: true }
        workspaces:
          type: array
          items:
            $ref: '#/components/schemas/WorkspaceSummary'
        createdAt: { type: string, format: date-time }
        updatedAt: { type: string, format: date-time }

    WorkspaceSummary:
      type: object
      properties:
        id: { type: string }
        name: { type: string }
        isDefault: { type: boolean }
        role:
          type: string
          enum: [admin, editor, viewer, member]
          description: Rôle de l'user dans CE workspace (différent du rôle global)

    Workspace:
      type: object
      properties:
        id: { type: string }
        name: { type: string }
        description: { type: string }
        companyId: { type: string }
        isDefault: { type: boolean }
        templatesAllowed:
          type: array
          items: { type: string }
          description: Liste des templateKey autorisés (vide = tous)
        createdAt: { type: string, format: date-time }

    Membership:
      type: object
      properties:
        userId: { type: string }
        workspaceId: { type: string }
        role:
          type: string
          enum: [admin, editor, viewer, member]
        userEmail: { type: string }

    SsoStatus:
      type: object
      properties:
        enabled: { type: boolean }
        mode:
          type: string
          enum: [disabled, hybrid, enforced]
        passwordLoginAllowed: { type: boolean }

    Pat:
      type: object
      properties:
        id: { type: string }
        name: { type: string }
        prefix: { type: string }
        scopes:
          type: array
          items: { type: string }
        lastUsedAt: { type: string, format: date-time, nullable: true }
        expiresAt: { type: string, format: date-time, nullable: true }
        revokedAt: { type: string, format: date-time, nullable: true }
        createdAt: { type: string, format: date-time }

    PatCreated:
      allOf:
        - $ref: '#/components/schemas/Pat'
        - type: object
          required: [token]
          properties:
            token:
              type: string
              description: Token clair, retourné UNIQUEMENT à la création. Stocke-le immédiatement.

    InvalidateSessionRequest:
      type: object
      required: [userId]
      properties:
        userId:
          type: string
          description: ObjectId du User dont on veut invalider les sessions
        reason:
          type: string
          description: Audit (ex. grant_removed, role_changed)

    Error:
      type: object
      properties:
        error: { type: string }
        message: { type: string }

paths:
  # ── SSO meta ─────────────────────────────────────────────
  /api/auth/sso/status:
    get:
      summary: État SSO
      tags: [SSO]
      security: []
      responses:
        '200':
          description: État
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Envelope'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/SsoStatus'

  /api/auth/sso/start:
    get:
      summary: Démarre un flow SSO (redirect vers Zitadel)
      tags: [SSO]
      security: []
      parameters:
        - in: query
          name: redirect_after
          schema: { type: string }
          description: Path frontend où rediriger après login (défaut /dashboard)
      responses:
        '302': { description: Redirect vers Zitadel authorize endpoint }
        '404': { description: SSO désactivé sur cette instance }

  /api/auth/sso/callback:
    get:
      summary: Callback OIDC depuis Zitadel
      tags: [SSO]
      security: []
      parameters:
        - in: query
          name: code
          schema: { type: string }
          required: true
        - in: query
          name: state
          schema: { type: string }
          required: true
      responses:
        '302':
          description: Redirect vers /auth/sso/complete?token=<jwt>&redirect=<path>

  /api/auth/sso/refresh:
    post:
      summary: Refresh tokens via session SSO
      tags: [SSO]
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [sessionId]
              properties:
                sessionId: { type: string }
      responses:
        '200':
          description: Nouveau JWT Kinn + expiration accessToken
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Envelope'
                  - type: object
                    properties:
                      data:
                        type: object
                        properties:
                          token: { type: string }
                          expiresAt: { type: string, format: date-time, nullable: true }

  /api/auth/sso/logout:
    get:
      summary: RP-initiated logout (redirect vers end_session Zitadel)
      tags: [SSO]
      parameters:
        - in: query
          name: sessionId
          schema: { type: string }
      responses:
        '302': { description: Redirect vers Zitadel end_session_endpoint }

  # ── Profile + PATs ───────────────────────────────────────
  /api/me:
    get:
      summary: Profil de l'user courant + ses workspaces
      tags: [Me]
      responses:
        '200':
          description: Profil
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Envelope'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/User'

  /api/me/pats:
    get:
      summary: Liste des PAT de l'user
      tags: [PAT]
      responses:
        '200':
          description: Liste
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Envelope'
                  - type: object
                    properties:
                      data:
                        type: array
                        items: { $ref: '#/components/schemas/Pat' }
    post:
      summary: Crée un PAT (le token clair n'est retourné QUE dans cette réponse)
      tags: [PAT]
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [name]
              properties:
                name: { type: string }
                expiresInDays: { type: integer, minimum: 1, maximum: 3650 }
                scopes:
                  type: array
                  items: { type: string }
      responses:
        '201':
          description: PAT créé (token clair inclus)
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Envelope'
                  - type: object
                    properties:
                      data: { $ref: '#/components/schemas/PatCreated' }

  /api/me/pats/{id}:
    delete:
      summary: Révoque un PAT
      tags: [PAT]
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string }
      responses:
        '200': { description: Révoqué }

  # ── Users ────────────────────────────────────────────────
  /api/users:
    get:
      summary: Liste paginée des users de la company
      tags: [Users]
      parameters:
        - in: query
          name: page
          schema: { type: integer, default: 1 }
        - in: query
          name: limit
          schema: { type: integer, default: 50, maximum: 200 }
        - in: query
          name: q
          schema: { type: string }
          description: Search par email
        - in: query
          name: sort
          schema: { type: string, default: 'createdAt:desc' }
      responses:
        '200':
          description: Liste paginée
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Envelope'
                  - type: object
                    properties:
                      data:
                        type: object
                        properties:
                          total: { type: integer }
                          page: { type: integer }
                          limit: { type: integer }
                          items:
                            type: array
                            items: { $ref: '#/components/schemas/User' }
    post:
      summary: Crée un user local (rare en mode SSO — utilise le SSO JIT à la place)
      description: |
        Crée un user avec password local. Pour les comptes break-glass uniquement.
        Pour les users SSO, ne pas appeler cet endpoint — ils sont créés JIT au callback.
      tags: [Users]
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [email]
              properties:
                email: { type: string, format: email }
                password: { type: string }
                role:
                  type: string
                  enum: [admin, user]
                  description: 'admin ou user (legacy enum, sera mapped editor en interne)'
                workspaces:
                  type: array
                  items: { type: string }
                  description: IDs ou keys de workspaces où ajouter le user
      responses:
        '201':
          description: User créé
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Envelope'
                  - type: object
                    properties:
                      data:
                        type: object
                        properties:
                          id: { type: string }

  /api/users/{id}:
    get:
      summary: Détails d'un user
      tags: [Users]
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string }
          description: ObjectId ou email
      responses:
        '200':
          description: User
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Envelope'
                  - type: object
                    properties:
                      data: { $ref: '#/components/schemas/User' }
    put:
      summary: Modifie role + memberships d'un user
      tags: [Users]
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string }
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                role:
                  type: string
                  enum: [admin, editor, viewer]
                workspaces:
                  type: array
                  items: { type: string }
                  description: Liste des workspaces où le user doit être membre. Cela RESET les memberships.
                localPromotion:
                  type: string
                  enum: [admin, editor, viewer]
                  nullable: true
                  description: Override local survivant aux sync Zitadel. À utiliser pour break-glass uniquement.
      responses:
        '200': { description: User mis à jour }

  # ── Workspaces ───────────────────────────────────────────
  /api/workspaces:
    post:
      summary: Crée un workspace (admin company)
      tags: [Workspaces]
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [name]
              properties:
                name: { type: string }
                description: { type: string }
                isDefault: { type: boolean, default: false }
                templatesAllowed:
                  type: array
                  items: { type: string }
      responses:
        '201':
          description: Workspace créé
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Envelope'
                  - type: object
                    properties:
                      data: { $ref: '#/components/schemas/Workspace' }

  /api/workspaces/{wsId}:
    put:
      summary: Modifie un workspace
      tags: [Workspaces]
      parameters:
        - in: path
          name: wsId
          required: true
          schema: { type: string }
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name: { type: string }
                description: { type: string }
                templatesAllowed:
                  type: array
                  items: { type: string }
      responses:
        '200': { description: Updated }
    delete:
      summary: Supprime un workspace
      tags: [Workspaces]
      parameters:
        - in: path
          name: wsId
          required: true
          schema: { type: string }
      responses:
        '200': { description: Deleted }

  # ── Memberships ──────────────────────────────────────────
  /api/workspaces/{wsId}/members:
    get:
      summary: Liste des membres d'un workspace
      tags: [Memberships]
      parameters:
        - in: path
          name: wsId
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Liste
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Envelope'
                  - type: object
                    properties:
                      data:
                        type: array
                        items: { $ref: '#/components/schemas/Membership' }
    post:
      summary: Ajoute un membre
      tags: [Memberships]
      parameters:
        - in: path
          name: wsId
          required: true
          schema: { type: string }
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                userId: { type: string, description: 'ObjectId User' }
                email: { type: string, format: email, description: 'Alternative au userId' }
                role:
                  type: string
                  enum: [admin, editor, viewer, member]
                  default: editor
      responses:
        '201': { description: Member added }

  /api/workspaces/{wsId}/members/{userId}:
    patch:
      summary: Change le rôle d'un membre dans le workspace
      tags: [Memberships]
      parameters:
        - in: path
          name: wsId
          required: true
          schema: { type: string }
        - in: path
          name: userId
          required: true
          schema: { type: string }
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [role]
              properties:
                role:
                  type: string
                  enum: [admin, editor, viewer, member]
      responses:
        '200': { description: Role updated }
    delete:
      summary: Retire un membre du workspace
      tags: [Memberships]
      parameters:
        - in: path
          name: wsId
          required: true
          schema: { type: string }
        - in: path
          name: userId
          required: true
          schema: { type: string }
      responses:
        '200': { description: Removed }

  # ── Internal webhooks (HMAC, poussés par Kinn-panel) ─────
  /internal/auth/invalidate-session:
    post:
      summary: Invalide toutes les sessions actives d'un user (push révocation Zitadel)
      tags: [Internal]
      security:
        - KinnPanelHmac: []
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/InvalidateSessionRequest'
      responses:
        '200':
          description: Sessions invalidées
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
                  userId: { type: string }
                  sessionVersion: { type: integer }
        '401':
          description: Signature HMAC invalide
        '404':
          description: User non trouvé

tags:
  - name: SSO
    description: Endpoints OIDC (login, refresh, logout)
  - name: Me
    description: User courant
  - name: PAT
    description: Personal Access Tokens
  - name: Users
    description: CRUD users de la company
  - name: Workspaces
    description: CRUD workspaces
  - name: Memberships
    description: Gestion des memberships workspace ↔ user
  - name: Internal
    description: Webhooks HMAC poussés par Kinn-panel
```

---

## 6. Exemples curl

### 6.1 Kinn-panel crée un PAT (bootstrap)

```bash
# 1. Login avec le compte system (créé au seed avec bypassSSO: true)
TOKEN=$(curl -s -X POST https://acme.kinn.fr/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"system@acme.kinn.fr","password":"<random>"}' \
  | jq -r '.data.token')

# 2. Crée un PAT longue durée
curl -X POST https://acme.kinn.fr/api/me/pats \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"kinn-panel-sync","expiresInDays":3650}'
# → réponse contient .data.token = "kpat_xxx" → stocker chiffré côté Kinn-panel
```

### 6.2 Kinn-panel ajoute un user à un workspace

```bash
PAT=kpat_<from-step-1>

curl -X POST https://acme.kinn.fr/api/workspaces/wsXYZ/members \
  -H "Authorization: Bearer $PAT" \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@acme.com","role":"editor"}'
```

### 6.3 Kinn-panel invalide une session (HMAC)

```bash
SECRET=<KINN_PANEL_HMAC_SECRET>
BODY='{"userId":"65f1abc123","reason":"grant_removed"}'
SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)

curl -X POST https://acme.kinn.fr/internal/auth/invalidate-session \
  -H "X-Kinn-Panel-Signature: sha256=$SIG" \
  -H 'Content-Type: application/json' \
  -d "$BODY"
# → 200 { ok: true, userId, sessionVersion }
```

### 6.4 Kinn-panel observe l'état d'un user

```bash
curl https://acme.kinn.fr/api/users/alice@acme.com \
  -H "Authorization: Bearer $PAT" | jq '.data'
```

---

## 7. Notes d'implémentation

- **Idempotence** : `POST /workspaces/:wsId/members` accepte qu'on rajoute un membre déjà présent (pas d'erreur, no-op).
- **Pagination** : tous les `GET liste` supportent `?page=&limit=` (max 200).
- **Errors** : format `{ success: false, error: { code, message, details? } }`.
- **CORS** : Kinn-panel doit être whitelisté côté Kinn (env `CORS_ORIGINS` ou ingress) si appels cross-origin.
- **Timeouts** : pour `POST /internal/auth/invalidate-session`, prévois un timeout 5s côté Kinn-panel + retry exponentiel max 3 tentatives.

## 8. Versionning

`v1.0.0` — couvre SSO Niveau 1 (workspaces purement Kinn-DB, pas de sync vers Zitadel groups). Si on passe en Niveau 2 (sync workspaces ↔ Zitadel projects), on bump en `v2.0.0` et ajoute `/api/internal/sync/workspaces` etc.
