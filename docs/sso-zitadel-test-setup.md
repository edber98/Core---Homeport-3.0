# Test SSO Zitadel sans Kinn-panel — Runbook

Guide pas-à-pas pour configurer manuellement une instance Zitadel et tester l'auth SSO Kinn de bout en bout. À utiliser en dev/staging quand Kinn-panel n'orchestre pas encore.

---

## Pré-requis

- Une instance Zitadel (cloud `*.zitadel.cloud` ou self-hosted, version ≥ 2.50)
- Un compte admin sur cette instance Zitadel
- Une instance Kinn locale qui tourne (`docker-compose up` ou `npm start` dans `/API`)
- MongoDB accessible (déjà lancé via le compose)

---

## Étape 1 — Créer une Org Zitadel pour ton client de test

Console Zitadel → menu en haut à droite (sélecteur d'org) → **Add Organization**.

| Champ | Valeur |
|---|---|
| Name | `ACME` (ou le nom de ton client de test) |

Note l'**Organization ID** affiché en haut une fois créé (ex: `298732189471823472`). Ce sera ton `org_id` côté claims.

---

## Étape 2 — Créer un Project Zitadel

Dans l'org ACME → **Projects** → **Create New Project**.

| Champ | Valeur |
|---|---|
| Name | `Kinn` |
| Project Role Assertion | ✅ **on** ("Assert Roles on Authentication") |
| Project Role Check | ❌ off (sinon les users sans role grant sont refusés à l'auth) |
| Has Project Check | ❌ off |

Note le **Resource ID** (= `projectId`, ex: `298732189471823472`). Ce sera ton `ZITADEL_PROJECT_ID`.

---

## Étape 3 — Définir les Project Roles

Dans le project Kinn → **Roles** → **New** :

| Key | Display Name | Group |
|---|---|---|
| `admin` | Admin | (vide) |
| `editor` | Editor | (vide) |
| `viewer` | Viewer | (vide) |

⚠️ Les **keys** doivent être exactement `admin`, `editor`, `viewer` (en minuscules) si tu veux le mapping 1:1. Sinon, tu devras configurer `SSO_ROLE_MAP` (voir l'étape 7).

---

## Étape 4 — Créer une Application OIDC

Toujours dans le project Kinn → **Applications** → **+ New Application**.

| Étape | Choix |
|---|---|
| Name | `Kinn Web` |
| Type | **Web** (confidential client, pas SPA) |
| Authentication Method | **CODE** (Authorization Code + PKCE) |
| Redirect URIs | `http://localhost:5055/api/auth/sso/callback`<br>(ou `https://<ton-domaine>/api/auth/sso/callback` en prod) |
| Post Logout URIs | `http://localhost:5050/login` |
| Development Mode | ✅ **on** (autorise http en local — décocher en prod) |
| Auth Token Type | **JWT** |

À la fin, Zitadel affiche **une seule fois** :
- **Client ID** (ex: `28876423...@kinn`) → `ZITADEL_CLIENT_ID`
- **Client Secret** → `ZITADEL_CLIENT_SECRET` (copie-le, irrécupérable ensuite)

### Settings additionnels de l'application

Onglet **Token Settings** :
- ✅ **User Roles Inside ID Token** (sinon les claims roles ne sont pas dans l'ID token, fallback userinfo nécessaire)
- ✅ **User Info Inside ID Token** (recommandé)
- ✅ **Issue ID Token on auth response**

Onglet **Redirect Settings** : vérifier que `Refresh Token` est autorisé (pour `offline_access`).

---

## Étape 5 — Créer un User de test

Org ACME → **Users** → **+ New** :

| Champ | Valeur |
|---|---|
| First Name | Alice |
| Last Name | Test |
| Email | `alice@acme.test` |
| Username | `alice@acme.test` |
| Password | (initial, à changer au login) |
| Email Verified | ✅ **on** (sinon Kinn refuse — `email_verified === false` → erreur) |

---

## Étape 6 — Grant un Project Role au User

Org ACME → **Authorizations** (ou **Authorization** dans certaines versions) → **+ New** :

| Champ | Valeur |
|---|---|
| User | Alice (sélectionner) |
| Project | Kinn |
| Role | `admin` (ou `editor`, `viewer` selon ce que tu veux tester) |

⚠️ Sans ce grant, Alice est authentifiée mais sans role → Kinn fallback sur `editor` (configurable via `SSO_ROLE_MAP=*:role`).

---

## Étape 7 — Set User Metadata (kinn_client_id, kinn_kind, kinn_groups)

C'est la partie que **Kinn-panel ferait normalement automatiquement**. En manuel :

Toujours dans Org ACME → **Users** → Alice → **Metadata** :

| Key | Value | Pourquoi |
|---|---|---|
| `kinn_client_id` | `<ObjectId Mongo de la Company Kinn>` | Lookup Company au login |
| `kinn_kind` | `client_user` | Stocké sur User.kind (informatif) |
| `kinn_groups` | `["admin","ops"]` | Stocké sur User.groups (informatif) |

**Important** : pour avoir le bon `kinn_client_id`, il te faut d'abord créer la Company Kinn (étape 9) **avant** de poser ce metadata, OU la créer après et mettre à jour le metadata.

Comment Zitadel transmet ce metadata dans l'ID token ? Par défaut Zitadel **ne le fait pas**. Tu as deux options :

### Option A (simple) — Action Zitadel pour exposer les metadata en claims

Org ACME → **Actions** → **+ New Action** :

```javascript
function setKinnClaims(ctx, api) {
  const md = ctx.v1.user.metadata || [];
  for (const m of md) {
    if (m.key === 'kinn_client_id') {
      api.v1.claims.setClaim('kinn_client_id', new TextDecoder().decode(new Uint8Array(m.value)));
    }
    if (m.key === 'kinn_kind') {
      api.v1.claims.setClaim('kinn_kind', new TextDecoder().decode(new Uint8Array(m.value)));
    }
    if (m.key === 'kinn_groups') {
      try {
        api.v1.claims.setClaim('kinn_groups', JSON.parse(new TextDecoder().decode(new Uint8Array(m.value))));
      } catch {}
    }
  }
}
```

| Champ | Valeur |
|---|---|
| Name | `setKinnClaims` |
| Script | (le code ci-dessus) |
| Trigger | **Pre Userinfo Creation** + **Pre Access Token Creation** |
| Allowed To Fail | ✅ |

Active l'action sur les **Flow Types** : `Internal Authentication` et `External Authentication`.

### Option B (sans action) — Lookup company via `zitadelOrgId`

Si tu ne veux pas configurer d'Action Zitadel, le code Kinn `jit-provisioner.js` a un **fallback** : il lit `urn:zitadel:iam:user:resourceowner:id` (l'org_id Zitadel, claim standard exposé) et cherche `Company.zitadelOrgId === claims.org_id`.

Dans ce cas, étape 9 : tu crées la Company avec `zitadelOrgId: '<l-org-id-zitadel>'` au lieu de poser `kinn_client_id` en metadata. Plus simple en test, mais moins flexible (1 org Zitadel ↔ 1 Company Kinn par convention).

---

## Étape 8 — Récupérer les valeurs à mettre dans Kinn

Tu as maintenant :

| Variable Kinn | Valeur Zitadel |
|---|---|
| `ZITADEL_ISSUER` | URL de ton instance Zitadel (ex: `https://kinn-dev-x4y2z9.zitadel.cloud`) |
| `ZITADEL_CLIENT_ID` | Client ID de l'app OIDC |
| `ZITADEL_CLIENT_SECRET` | Client Secret de l'app OIDC |
| `ZITADEL_PROJECT_ID` | Resource ID du project Kinn |
| `ZITADEL_REDIRECT_URI` | `http://localhost:5055/api/auth/sso/callback` |
| `ZITADEL_POST_LOGOUT_URI` | `http://localhost:5050/login` |

---

## Étape 9 — Créer la Company Kinn correspondante

Avant de tester, faut que la DB Kinn ait une Company qui matche le claim. Deux solutions :

### Si tu as posé `kinn_client_id` en User Metadata (option A étape 7)

```bash
# Connecte-toi en mongo
docker exec -it <kinn-mongo-container> mongosh kinn
# Crée la company et note son _id
> db.companies.insertOne({ name: 'ACME', createdAt: new Date(), updatedAt: new Date() })
{ acknowledged: true, insertedId: ObjectId('65fabc...') }
# Reviens en Zitadel poser ce ObjectId dans le metadata kinn_client_id de Alice
```

### Si tu n'as PAS posé de metadata (option B étape 7)

```bash
> db.companies.insertOne({ name: 'ACME', zitadelOrgId: '<org-id-zitadel-de-l-étape-1>' })
```

Dans les deux cas, crée aussi un workspace par défaut dans la company :

```bash
> const c = db.companies.findOne({ name: 'ACME' })
> db.workspaces.insertOne({ name: 'Default', companyId: c._id, isDefault: true, createdAt: new Date(), updatedAt: new Date() })
```

---

## Étape 10 — Configurer Kinn

Édite ton `.env` :

```bash
SSO_MODE=hybrid
ZITADEL_ISSUER=https://kinn-dev-x4y2z9.zitadel.cloud
ZITADEL_CLIENT_ID=28876423001234567@kinn
ZITADEL_CLIENT_SECRET=<le-secret>
ZITADEL_PROJECT_ID=28876423001234568
ZITADEL_REDIRECT_URI=http://localhost:5055/api/auth/sso/callback
ZITADEL_POST_LOGOUT_URI=http://localhost:5050/login
KINN_PUBLIC_URL=http://localhost:5055
FRONTEND_BASE_URL=http://localhost:5050
KINN_PANEL_HMAC_SECRET=test-hmac-secret-change-in-prod
SSO_ROLE_MAP=        # vide = 1:1
```

Restart Kinn (le module openid-client `Issuer.discover` se fait au premier appel SSO, pas au boot).

---

## Étape 11 — Tester le flow complet

### 11.1 Vérifier que le SSO est exposé

```bash
curl http://localhost:5055/api/auth/sso/status
# → { "success": true, "data": { "enabled": true, "mode": "hybrid", "passwordLoginAllowed": true } }
```

Si `enabled: false` : check tes env vars `SSO_MODE` + `ZITADEL_ISSUER` + `ZITADEL_CLIENT_ID` (les trois doivent être posées).

### 11.2 Tester le redirect vers Zitadel

Ouvre dans ton navigateur :
```
http://localhost:5055/api/auth/sso/start
```

Tu devrais être redirigé vers `https://<ton-zitadel>/oauth/v2/authorize?...` avec `client_id`, `code_challenge`, `state`, `nonce`, `scope` dans l'URL.

⚠️ Vérifie que `scope` contient `urn:zitadel:iam:org:project:<projectId>:roles` — sinon les roles ne seront pas dans l'ID token.

### 11.3 Login Alice côté Zitadel

Saisis `alice@acme.test` + son password. Au premier login, Zitadel demande de changer le password + setup MFA si ta policy l'exige.

### 11.4 Vérifier le retour callback

Si tout marche, redirect vers `http://localhost:5050/auth/sso/complete?token=eyJ...&redirect=/dashboard` puis automatique vers `/dashboard` connecté.

Logs Kinn que tu devrais voir :
```
[sso] callback: code=..., state=...
[sso] tokenSet claims: { sub, email, role: 'admin', ... }
[jit-provisioner] new user: alice@acme.test
[jit-provisioner] attached to workspace: Default
```

### 11.5 Vérifier en DB

```bash
> db.users.findOne({ email: 'alice@acme.test' })
{
  _id: ObjectId('...'),
  email: 'alice@acme.test',
  zitadelSub: '...',
  role: 'admin',         # ← mapping depuis project role Zitadel
  kind: 'client_user',   # ← User Metadata si Action posée
  groups: ['admin','ops'],
  companyId: ObjectId('65fabc...'),
  sessionVersion: 0,
  ...
}

> db.sessions.findOne({ userId: <alice._id> })
{
  refreshTokenEnc: '...',  # chiffré
  accessTokenEnc: '...',
  zitadelSub: '...',
  ...
}
```

### 11.6 Tester refresh

```bash
SESSION_ID=<id de la session ci-dessus>
curl -X POST http://localhost:5055/api/auth/sso/refresh \
  -H 'Content-Type: application/json' \
  -d "{\"sessionId\":\"$SESSION_ID\"}"
# → { success: true, data: { token: "...", expiresAt: "..." } }
```

### 11.7 Tester invalidate-session (HMAC)

```bash
SECRET=test-hmac-secret-change-in-prod
USER_ID=<alice._id>
BODY="{\"userId\":\"$USER_ID\",\"reason\":\"manual_test\"}"
SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)

curl -X POST http://localhost:5055/internal/auth/invalidate-session \
  -H "X-Kinn-Panel-Signature: sha256=$SIG" \
  -H 'Content-Type: application/json' \
  -d "$BODY"
# → 200 { ok: true, userId, sessionVersion: 1 }
```

Vérifie que `db.users.findOne(...).sessionVersion` est passé à `1`. Le JWT actuel d'Alice est désormais invalide → toute requête API → 401 `session_invalidated`. Elle doit re-login.

### 11.8 Tester logout

Dans la frontend, click sur "Déconnexion" → tu es redirigé vers `https://<zitadel>/oidc/v1/end_session?id_token_hint=...&post_logout_redirect_uri=http://localhost:5050/login`. Zitadel termine la session puis redirect vers `/login`.

---

## Étape 12 — Cas de tests à valider

| # | Test | Résultat attendu |
|---|---|---|
| 1 | User Zitadel sans grant → login | Authentifié, role = fallback `editor` (ou ce qui est en `SSO_ROLE_MAP=*:role`) |
| 2 | User Zitadel `email_verified: false` → login | Refusé, error `Email non vérifié côté Zitadel` |
| 3 | User Zitadel sans `kinn_client_id` ET sans Company avec `zitadelOrgId` matchant | Refusé, error `Aucune Company Kinn ne correspond` |
| 4 | User avec project role `admin` → login | role Kinn = `admin` |
| 5 | User avec project role `viewer` → login | role Kinn = `viewer`, accès limité (lecture seule) |
| 6 | User avec project role `admin` + role `viewer` | role Kinn = `admin` (le plus haut gagne) |
| 7 | `SSO_ROLE_MAP=superadmin:admin,*:viewer` + user grant `superadmin` | role Kinn = `admin` |
| 8 | `localPromotion: 'admin'` posé en DB sur un user qui a Zitadel role `viewer` | Effective role = `admin` (override survit) |
| 9 | `SSO_MODE=enforced` + tentative login email/password sur user normal | Refusé |
| 10 | `SSO_MODE=enforced` + login email/password sur user `bypassSSO: true` | Autorisé |
| 11 | Invalidate-session HMAC avec mauvaise signature | 401 `invalid_signature` |
| 12 | Refresh avec `sessionId` inexistant | 404 `session_not_found` |

---

## Étape 13 — Debug

### `state expired or invalid` au callback

Le state JWT (signé HMAC_SECRET) a une TTL de 10 min. Si tu mets >10min entre le clic "Login SSO" et la fin du flow → expiré. Recommence.

### `Aucune Company Kinn ne correspond aux claims`

Soit le claim `kinn_client_id` n'arrive pas (Action Zitadel pas active), soit l'`urn:zitadel:iam:user:resourceowner:id` ne match aucune `Company.zitadelOrgId`. Logs Kinn affichent les claims reçus :

```
[jit-provisioner] resolveCompany failed for kinn_client_id="..." orgId="..."
```

Vérifie :
- L'Action Zitadel est bien attachée aux flows `Internal Authentication` + `External Authentication`
- Le metadata `kinn_client_id` est bien un ObjectId valide (24 chars hex)
- La Company existe bien dans Mongo

### Roles vide dans claims

Vérifie :
- Onglet Token Settings de l'app : "User Roles Inside ID Token" ✅
- Project Settings : "Assert Roles on Authentication" ✅
- L'utilisateur a bien un grant via `Authorizations`
- Le scope demandé inclut `urn:zitadel:iam:org:project:<projectId>:roles` (vérif dans les logs `[sso] start` ou inspect l'URL avant de cliquer login)

### `403 forbidden` après login (pourtant role admin en DB)

Vérifie le `effectiveRole(user)` : si `localPromotion` est `null` et `role` est valide, ça devrait passer. Re-fetch `/api/me` pour voir le rôle effectif retourné par Kinn.

### Le navigateur reste bloqué sur `/auth/sso/complete`

Console F12 → onglet Network → vérifie le call `/api/me` au callback. Si 401 → le JWT n'est pas accepté (vérifie la signature HMAC, le TTL).

---

## Étape 14 — Reset propre pour re-tester from scratch

```bash
# DB Kinn
docker exec -it <mongo> mongosh kinn --eval "
  db.users.deleteMany({ zitadelSub: { \$ne: null } });
  db.sessions.deleteMany({});
  db.workspacememberships.deleteMany({});
"
```

Puis efface le user dans Zitadel (ou laisse, juste re-set son Metadata si tu changes la Company).

---

## Tableau récap des IDs à connaître

| Variable | Origine | Format |
|---|---|---|
| `org_id` Zitadel | Étape 1 | `298732189471823472` (long int as string) |
| `project_id` Zitadel | Étape 2 | `298732189471823472` |
| `client_id` OIDC | Étape 4 | `28876423001234567@kinn` |
| `client_secret` OIDC | Étape 4 | `xyz...` (random secret) |
| `kinn_client_id` (metadata) | Étape 9 | ObjectId Mongo `65fabc...` (24 hex chars) |
| `Company.zitadelOrgId` (alt) | Étape 9 | = org_id Zitadel |

---

## Une fois Kinn-panel branché

Tout ce que tu viens de faire à la main, Kinn-panel l'automatise :

- Étapes 1-6 → API Zitadel Management (`org create`, `project create`, `role add`, `application create`, `user create`, `grant add`)
- Étape 7 (Action Zitadel) → posée une seule fois sur l'org parent au seed Kinn-panel
- Étape 7 (Metadata) → API `set user metadata`
- Étape 9 (Company Mongo) → POST `/api/companies` côté Kinn-panel ou directement insertion DB
- Étape 10 (env vars) → values.yaml du Helm chart `kinn_manifest`
