# Guide d'activation SSO / OAuth2 des connecteurs Kinn

> **But du document** : recenser tous les services du catalogue Kinn qui proposent une
> authentification SSO / OAuth2, décrire **comment créer l'application OAuth sur la
> plateforme de chaque éditeur**, et lister tout ce qu'il faut **ajouter dans le
> concentrateur `auth.kinn.fr` (le « bouncer »)** pour étendre l'allowlist de vendors.
>
> ⚠️ **Fiabilité des endpoints** : les URLs `authorize`/`token` et les scopes ci-dessous
> proviennent de la connaissance des APIs publiques. Les éditeurs font évoluer leurs
> versions d'API → **toujours reconfirmer sur la doc officielle du vendor** avant
> d'inscrire les valeurs en production. Les liens de console développeur sont fournis
> pour ça.

---

## 1. Comment ça marche aujourd'hui (rappel express)

- **Moteur OAuth générique** côté instance Kinn : `API/src/oauth/{provider-auth,oauth2-runtime,state}.js`
  + `API/src/modules/oauth-connections.js`. Tout est **piloté par le manifest** du
  connecteur (`auth.oauth2 { ... }`). Aucun code moteur à écrire par connecteur.
- **Concentrateur `auth.kinn.fr` (Panel, autre repo)** : relaie uniquement le `code` OAuth
  (302), ne voit jamais les tokens, ne détient pas le secret. Il porte une **allowlist de
  vendors codée en dur** (`KNOWN_PROVIDERS`).
- **Redirect URI universel** (le même chez tous les éditeurs) :

  ```
  https://auth.kinn.fr/oauth/<vendor>/callback
  ```

  où `<vendor>` est le slug du vendor (ex. `google`, `microsoft`, `slack`…).
  Source de vérité : `API/src/oauth/provider-auth.js` →
  `${KINN_OAUTH_CONCENTRATOR_URL}/oauth/${vendor}/callback`.

### Vendors déjà câblés dans le concentrateur (allowlist actuelle)

| Vendor | Statut | Connecteurs Kinn concernés |
|---|---|---|
| `google` | ✅ actif | Gmail, Google Calendar, Google Drive (+ Sheets/Docs/Chat/Google-AI à brancher) |
| `microsoft` | ✅ actif | Microsoft (Graph/Teams/Users), OneDrive/SharePoint, Outlook mail (stub), Outlook calendar (stub) |
| `meta` | ⚙️ câblé (env prêtes) | Facebook, Instagram, WhatsApp (à brancher) |
| `tiktok` | ⚙️ câblé (env prêtes) | — (pas encore de connecteur) |

> **Tout vendor hors de cette liste est rejeté par le Panel** tant qu'on ne l'ajoute pas
> à `KNOWN_PROVIDERS` (ou qu'on ne fait pas lire le Panel depuis une table `OAuthProvider`).
> C'est l'objet de l'extension visée par ce document.

---

## 2. La démarche, en 2 volets, pour CHAQUE nouveau service

### Volet A — Sur la plateforme de l'éditeur (créer l'app OAuth)

1. Créer / se connecter à un **compte développeur** sur la console de l'éditeur.
2. Créer une **application OAuth** (ou « Connected App » / « Integration »).
3. Enregistrer le **Redirect URI** : `https://auth.kinn.fr/oauth/<vendor>/callback`.
4. Cocher les **scopes** nécessaires (et `offline_access` / refresh token si l'API le demande).
5. Récupérer le **Client ID** et le **Client Secret** (parfois passer l'app en « production »
   ou demander une « review » selon l'éditeur).

### Volet B — Côté Kinn (3 endroits)

1. **Concentrateur (Panel)** : ajouter `<vendor>` à l'allowlist `KNOWN_PROVIDERS` (ou DB
   `OAuthProvider`) **+** déclarer la mappe `vendor → {authorizeUrl, tokenUrl}` si le Panel
   valide l'URL provider.
2. **Variables d'environnement** de l'instance (`API/.env`, `docker-compose*.yaml`,
   `kinn_manifest/values.yaml`) :

   ```env
   KINN_OAUTH_RELAY_SECRET=...                  # commun
   KINN_OAUTH_CONCENTRATOR_URL=https://auth.kinn.fr
   <VENDOR>_OAUTH_CLIENT_ID=...
   <VENDOR>_OAUTH_CLIENT_SECRET=...
   ```

   Les noms exacts d'env sont libres : ils sont déclarés dans le manifest via `clientIdEnv`
   / `clientSecretEnv`.
3. **Manifest du connecteur** (`API/src/plugins/repos/<plugin>/manifest.json`) : ajouter le
   bloc `auth` (gabarit en §4), puis **ré-importer** (`PLUGIN_IMPORT_ENABLED=1` + restart)
   sinon le bouton « Se connecter » n'apparaît pas (le `auth` n'est en DB qu'après ré-import).

---

## 3. Checklist d'extension du concentrateur (pour chaque vendor ajouté)

- [ ] App OAuth créée chez l'éditeur, redirect `https://auth.kinn.fr/oauth/<vendor>/callback`
- [ ] `<vendor>` ajouté à `KNOWN_PROVIDERS` du Panel (+ mappe d'URLs si vérif provider)
- [ ] `CLIENT_ID` / `CLIENT_SECRET` posés en env sur les instances
- [ ] Bloc `auth.oauth2` ajouté au manifest du connecteur
- [ ] Manifest ré-importé (`PLUGIN_IMPORT_ENABLED=1` + restart)
- [ ] Test bout-en-bout : bouton « Se connecter » → consentement → credential créé → refresh OK

---

## 4. Gabarit de bloc `auth.oauth2` (manifest)

Calqué sur `API/src/plugins/repos/gmail/manifest.json` :

```jsonc
"auth": {
  "type": "oauth2",
  "oauth2": {
    "useBouncer": true,                 // passe par auth.kinn.fr
    "vendor": "<vendor>",               // slug d'URL du bouncer
    "authorizeUrl": "https://.../authorize",
    "tokenUrl": "https://.../token",
    "userinfoUrl": "https://.../userinfo",   // optionnel
    "clientIdEnv": "<VENDOR>_OAUTH_CLIENT_ID",
    "clientSecretEnv": "<VENDOR>_OAUTH_CLIENT_SECRET",
    "scopes": ["scope.a", "scope.b"],
    "scopeSeparator": " ",
    "authorizationParams": { "access_type": "offline", "prompt": "consent" },
    "tokenAuthMethod": "body",          // ou "basic" selon l'éditeur
    "pkce": false,                       // true si l'éditeur exige PKCE
    "requireRefreshToken": true,
    "fieldMap": {                        // PRÉFIXER (token./userinfo.) sinon littéral stocké
      "email": "userinfo.email",
      "refreshToken": "token.refresh_token",
      "accessToken": "token.access_token",
      "scope": "token.scope",
      "tokenType": "token.token_type"
    }
  }
}
```

> **Pièges connus** (cf. mémo bouncer) : `fieldMap` **doit** être préfixé ; le `vendor`
> (slug d'URL) peut différer du `providerKey` ; certains scopes Microsoft (SharePoint,
> Teams) exigent un **admin consent** côté tenant.

---

## 5. Fiches par service

> Format : **Vendor slug** · console développeur · `authorizeUrl` · `tokenUrl` · scopes types · particularités.
> Redirect à enregistrer partout : `https://auth.kinn.fr/oauth/<vendor>/callback`.

### 5.1 — Déjà actifs (référence)

#### Google — Gmail, Calendar, Drive `vendor: google` ✅
- **Console** : <https://console.cloud.google.com> → APIs & Services → Identifiants → Créer un ID client OAuth (type « Application Web »). Configurer l'écran de consentement OAuth.
- **authorize** : `https://accounts.google.com/o/oauth2/v2/auth`
- **token** : `https://oauth2.googleapis.com/token`
- **scopes** : `openid email profile` + scope API (ex. `https://www.googleapis.com/auth/gmail.modify`, `.../calendar`, `.../drive`)
- **Particularités** : `access_type=offline` + `prompt=consent` pour obtenir le refresh token. App à passer « In production » pour les scopes sensibles (sinon limité aux testeurs).

#### Microsoft 365 — Graph, Teams, OneDrive, SharePoint, Outlook `vendor: microsoft` ✅
- **Console** : <https://entra.microsoft.com> (ou portal.azure.com) → App registrations → New registration → Certificates & secrets / API permissions.
- **authorize** : `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`
- **token** : `https://login.microsoftonline.com/common/oauth2/v2.0/token`
- **scopes** : `offline_access openid email profile` + permissions Graph déléguées (`Mail.ReadWrite`, `Calendars.ReadWrite`, `Files.ReadWrite.All`, `Sites.ReadWrite.All`, `Chat.ReadWrite`…)
- **Particularités** : endpoint `/common` (multi-tenant) ; `offline_access` obligatoire pour refresh ; certains scopes demandent **admin consent**.

### 5.2 — Vague Meta (vendor déjà câblé)

#### Facebook / Instagram / WhatsApp `vendor: meta` ⚙️
- **Console** : <https://developers.facebook.com> → My Apps → Create App → ajouter les produits (Facebook Login, Instagram Graph, WhatsApp).
- **authorize** : `https://www.facebook.com/v19.0/dialog/oauth`
- **token** : `https://graph.facebook.com/v19.0/oauth/access_token`
- **scopes** : selon produit (`email`, `pages_manage_posts`, `instagram_basic`, `whatsapp_business_messaging`…)
- **Particularités** : App Review Meta requise pour les scopes avancés ; tokens longue durée à échanger.

### 5.3 — Communication & collaboration

#### Slack `vendor: slack`
- **Console** : <https://api.slack.com/apps> → Create New App → OAuth & Permissions.
- **authorize** : `https://slack.com/oauth/v2/authorize`
- **token** : `https://slack.com/api/oauth.v2.access`
- **scopes** : `chat:write`, `channels:read`, `users:read`, `files:write`… (bot ou user scopes)
- **Particularités** : distinguer **bot token** vs **user token** ; pas de refresh par défaut (sauf token rotation activée).

#### Discord `vendor: discord`
- **Console** : <https://discord.com/developers/applications> → New Application → OAuth2.
- **authorize** : `https://discord.com/api/oauth2/authorize`
- **token** : `https://discord.com/api/oauth2/token`
- **scopes** : `identify`, `guilds`, `bot`, `messages.read`…

#### Zoom `vendor: zoom`
- **Console** : <https://marketplace.zoom.us> → Develop → Build App → OAuth.
- **authorize** : `https://zoom.us/oauth/authorize`
- **token** : `https://zoom.us/oauth/token`
- **scopes** : `meeting:write`, `user:read`, `recording:read`…
- **Particularités** : `tokenAuthMethod: "basic"` (Basic auth client_id:secret).

#### RingCentral `vendor: ringcentral`
- **Console** : <https://developers.ringcentral.com> → My Apps → Create App.
- **authorize** : `https://platform.ringcentral.com/restapi/oauth/authorize`
- **token** : `https://platform.ringcentral.com/restapi/oauth/token`

#### Aircall `vendor: aircall`
- **Console** : <https://dashboard.aircall.io> → Integrations / API.
- **authorize** : `https://dashboard.aircall.io/oauth/authorize`
- **token** : `https://api.aircall.io/v1/oauth/token`

### 5.4 — CRM, support & relation client

#### HubSpot `vendor: hubspot`
- **Console** : <https://developers.hubspot.com> → Create app → Auth.
- **authorize** : `https://app.hubspot.com/oauth/authorize`
- **token** : `https://api.hubapi.com/oauth/v1/token`
- **scopes** : `crm.objects.contacts.read/write`, `crm.objects.deals.*`, `tickets`…
- **Particularités** : refresh token fourni d'office ; scopes granulaires obligatoires.

#### Salesforce `vendor: salesforce`
- **Console** : Setup → App Manager → New Connected App (Enable OAuth Settings).
- **authorize** : `https://login.salesforce.com/services/oauth2/authorize`
- **token** : `https://login.salesforce.com/services/oauth2/token`
- **scopes** : `api`, `refresh_token`, `offline_access`, `full`…
- **Particularités** : domaine sandbox = `test.salesforce.com` ; instance_url renvoyée dans le token.

#### Pipedrive `vendor: pipedrive`
- **Console** : <https://developers.pipedrive.com> → Marketplace Manager → Create app.
- **authorize** : `https://oauth.pipedrive.com/oauth/authorize`
- **token** : `https://oauth.pipedrive.com/oauth/token`
- **Particularités** : `tokenAuthMethod: "basic"` ; api_domain renvoyé dans le token.

#### Zendesk `vendor: zendesk`
- **Console** : Admin Center → Apps and integrations → APIs → OAuth Clients.
- **authorize** : `https://<subdomain>.zendesk.com/oauth/authorizations/new`
- **token** : `https://<subdomain>.zendesk.com/oauth/tokens`
- **Particularités** : **URLs dépendantes du sous-domaine** → prévoir un champ `subdomain` dans le credentialsForm et le templating d'URL.

#### Intercom `vendor: intercom`
- **Console** : <https://developers.intercom.com> → Your Apps → Authentication / OAuth.
- **authorize** : `https://app.intercom.com/oauth`
- **token** : `https://api.intercom.io/auth/eagle/token`

#### Front `vendor: front`
- **Console** : <https://dev.frontapp.com> → OAuth.
- **authorize** : `https://app.frontapp.com/oauth/authorize`
- **token** : `https://app.frontapp.com/oauth/token`

#### Close CRM `vendor: close`
- **Console** : Settings → Developer / OAuth.
- **authorize** : `https://app.close.com/oauth2/authorize`
- **token** : `https://api.close.com/oauth2/token`

#### Outreach `vendor: outreach`
- **Console** : <https://www.outreach.io> → API / OAuth applications.
- **authorize** : `https://api.outreach.io/oauth/authorize`
- **token** : `https://api.outreach.io/oauth/token`

#### Salesloft `vendor: salesloft`
- **Console** : <https://accounts.salesloft.com> → OAuth Applications.
- **authorize** : `https://accounts.salesloft.com/oauth/authorize`
- **token** : `https://accounts.salesloft.com/oauth/token`

### 5.5 — Gestion de projet & productivité

#### Notion `vendor: notion`
- **Console** : <https://www.notion.so/my-integrations> → New integration (Public, OAuth).
- **authorize** : `https://api.notion.com/v1/oauth/authorize`
- **token** : `https://api.notion.com/v1/oauth/token`
- **Particularités** : `tokenAuthMethod: "basic"` ; pas de refresh (token longue durée) ; en-tête `Notion-Version` requis côté API.

#### Asana `vendor: asana`
- **Console** : <https://app.asana.com/0/my-apps> → OAuth.
- **authorize** : `https://app.asana.com/-/oauth_authorize`
- **token** : `https://app.asana.com/-/oauth_token`

#### Monday.com `vendor: monday`
- **Console** : <https://monday.com/developers/apps> → OAuth.
- **authorize** : `https://auth.monday.com/oauth2/authorize`
- **token** : `https://auth.monday.com/oauth2/token`

#### ClickUp `vendor: clickup`
- **Console** : Settings → Apps / Integrations → Create an App.
- **authorize** : `https://app.clickup.com/api`
- **token** : `https://api.clickup.com/api/v2/oauth/token`

#### Linear `vendor: linear`
- **Console** : Settings → API → OAuth applications.
- **authorize** : `https://linear.app/oauth/authorize`
- **token** : `https://api.linear.app/oauth/token`

#### Trello `vendor: trello`
- **Console** : <https://trello.com/power-ups/admin>.
- **Particularités** : Trello est en **OAuth 1.0a** (legacy) → ne rentre pas dans le moteur OAuth2 générique. Recommandé : rester sur API key + token, ou implémenter un flux spécifique.

#### Figma `vendor: figma`
- **Console** : <https://www.figma.com/developers/apps> → Create new OAuth app.
- **authorize** : `https://www.figma.com/oauth`
- **token** : `https://www.figma.com/api/oauth/token`

#### Miro `vendor: miro`
- **Console** : <https://miro.com/app/settings/user-profile/apps> → Create new app.
- **authorize** : `https://miro.com/oauth/authorize`
- **token** : `https://api.miro.com/v1/oauth/token`

#### Atlassian Jira / Confluence `vendor: atlassian`
- **Console** : <https://developer.atlassian.com/console/myapps> → OAuth 2.0 (3LO).
- **authorize** : `https://auth.atlassian.com/authorize`
- **token** : `https://auth.atlassian.com/oauth/token`
- **Particularités** : paramètre `audience=api.atlassian.com` ; `offline_access` pour refresh ; `cloudid` à résoudre après login.

#### Typeform `vendor: typeform`
- **Console** : <https://admin.typeform.com> → Account → Developer apps.
- **authorize** : `https://api.typeform.com/oauth/authorize`
- **token** : `https://api.typeform.com/oauth/token`

#### Calendly `vendor: calendly`
- **Console** : <https://developer.calendly.com> → My Apps / OAuth.
- **authorize** : `https://auth.calendly.com/oauth/authorize`
- **token** : `https://auth.calendly.com/oauth/token`

### 5.6 — Fichiers, docs & signature

#### Dropbox `vendor: dropbox`
- **Console** : <https://www.dropbox.com/developers/apps> → Create app.
- **authorize** : `https://www.dropbox.com/oauth2/authorize`
- **token** : `https://api.dropboxapi.com/oauth2/token`
- **Particularités** : `token_access_type=offline` (dans `authorizationParams`) pour le refresh token.

#### Box `vendor: box`
- **Console** : <https://app.box.com/developers/console> → Create New App → Custom App (OAuth 2.0).
- **authorize** : `https://account.box.com/api/oauth2/authorize`
- **token** : `https://api.box.com/oauth2/token`

#### DocuSign `vendor: docusign`
- **Console** : <https://developers.docusign.com> → Apps and Keys.
- **authorize** : `https://account.docusign.com/oauth/auth` (prod) / `account-d.docusign.com` (démo)
- **token** : `https://account.docusign.com/oauth/token`
- **scopes** : `signature`, `extended` (refresh)

#### Nextcloud `vendor: nextcloud`
- **Console** : Admin → Security → OAuth 2.0 clients (par instance Nextcloud).
- **authorize** : `https://<host>/index.php/apps/oauth2/authorize`
- **token** : `https://<host>/index.php/apps/oauth2/api/v1/token`
- **Particularités** : **URLs par instance** (self-hosted) → champ `host` + templating.

### 5.7 — Marketing & mailing

#### Mailchimp `vendor: mailchimp`
- **Console** : <https://admin.mailchimp.com> → Account → Extras → API / Registered apps.
- **authorize** : `https://login.mailchimp.com/oauth2/authorize`
- **token** : `https://login.mailchimp.com/oauth2/token`
- **Particularités** : `metadata` à appeler pour récupérer le datacenter (`dc`) → base API.

#### Autres (clé API surtout, OAuth marginal)
- **Klaviyo, Brevo, SendGrid, Mailgun, Postmark, Resend, ConvertKit, Beehiiv, Customer.io,
  Iterable, Instantly, Lemlist, Smartlead** : majoritairement **clé API** → garder le
  credentialsForm actuel. OAuth non prioritaire.

### 5.8 — Compta, finance & paiement

#### QuickBooks `vendor: quickbooks`
- **Console** : <https://developer.intuit.com> → My Apps → Keys & OAuth.
- **authorize** : `https://appcenter.intuit.com/connect/oauth2`
- **token** : `https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer`
- **scopes** : `com.intuit.quickbooks.accounting`
- **Particularités** : `realmId` (company) renvoyé dans le callback à stocker.

#### Xero `vendor: xero`
- **Console** : <https://developer.xero.com/app/manage> → New app.
- **authorize** : `https://login.xero.com/identity/connect/authorize`
- **token** : `https://identity.xero.com/connect/token`
- **scopes** : `offline_access accounting.transactions accounting.contacts`…

#### Stripe (Connect) `vendor: stripe`
- **Console** : <https://dashboard.stripe.com> → Settings → Connect.
- **authorize** : `https://connect.stripe.com/oauth/authorize`
- **token** : `https://connect.stripe.com/oauth/token`
- **Particularités** : pertinent surtout en mode **Connect** (gérer des comptes tiers) ; sinon clé API secrète suffit.

#### PayPal `vendor: paypal`
- **Console** : <https://developer.paypal.com/dashboard> → Apps & Credentials.
- **token** : `https://api-m.paypal.com/v1/oauth2/token`
- **Particularités** : surtout **client_credentials** (server-to-server), pas un flux utilisateur classique.

#### Pennylane `vendor: pennylane`
- **Console** : <https://pennylane.com> → Espace développeur / API.
- **authorize** : `https://app.pennylane.com/oauth/authorize`
- **token** : `https://app.pennylane.com/oauth/token`

#### Qonto `vendor: qonto`
- **Console** : <https://api-doc.qonto.com> → OAuth.
- **authorize** : `https://oauth.qonto.com/oauth2/auth`
- **token** : `https://oauth.qonto.com/oauth2/token`

### 5.9 — Réseaux sociaux & e-commerce

#### LinkedIn `vendor: linkedin`
- **Console** : <https://www.linkedin.com/developers/apps> → Create app → Auth.
- **authorize** : `https://www.linkedin.com/oauth/v2/authorization`
- **token** : `https://www.linkedin.com/oauth/v2/accessToken`
- **scopes** : `openid profile email w_member_social`…

#### Twitter / X `vendor: twitter`
- **Console** : <https://developer.twitter.com/en/portal/dashboard> → Projects & Apps.
- **authorize** : `https://twitter.com/i/oauth2/authorize`
- **token** : `https://api.twitter.com/2/oauth2/token`
- **Particularités** : **PKCE obligatoire** (`pkce: true`) ; `offline.access` pour refresh.

#### Shopify `vendor: shopify`
- **Console** : <https://partners.shopify.com> → Apps → Create app.
- **authorize** : `https://<shop>.myshopify.com/admin/oauth/authorize`
- **token** : `https://<shop>.myshopify.com/admin/oauth/access_token`
- **Particularités** : **URLs par boutique** → champ `shop` + templating ; scopes type `read_orders,write_products`.

#### Webflow `vendor: webflow`
- **Console** : <https://developers.webflow.com> → Apps → OAuth.
- **authorize** : `https://webflow.com/oauth/authorize`
- **token** : `https://api.webflow.com/oauth/access_token`

#### eBay `vendor: ebay`
- **Console** : <https://developer.ebay.com> → Application Keys / User Tokens.
- **authorize** : `https://auth.ebay.com/oauth2/authorize`
- **token** : `https://api.ebay.com/identity/v1/oauth2/token`

#### Airtable `vendor: airtable`
- **Console** : <https://airtable.com/create/oauth> → Register OAuth integration.
- **authorize** : `https://airtable.com/oauth2/v1/authorize`
- **token** : `https://airtable.com/oauth2/v1/token`
- **Particularités** : **PKCE obligatoire** (`pkce: true`).

### 5.10 — Dev & infra

#### GitHub `vendor: github`
- **Console** : Settings → Developer settings → OAuth Apps (ou GitHub App).
- **authorize** : `https://github.com/login/oauth/authorize`
- **token** : `https://github.com/login/oauth/access_token`
- **scopes** : `repo`, `read:org`, `workflow`…

#### GitLab `vendor: gitlab`
- **Console** : User Settings → Applications (ou Admin Area).
- **authorize** : `https://gitlab.com/oauth/authorize`
- **token** : `https://gitlab.com/oauth/token`
- **Particularités** : **PKCE** recommandé ; `read_api`, `api`, `read_repository`.

---

## 6. Tableau de référence (tri par priorité d'implémentation)

| Priorité | Service | vendor | PKCE | Refresh | Particularité clé |
|---|---|---|---|---|---|
| **Déjà OK** | Google (Gmail/Cal/Drive) | google | non | oui | `access_type=offline` |
| **Déjà OK** | Microsoft 365 | microsoft | non | oui | `/common`, admin consent |
| Haute | Meta (FB/IG/WA) | meta | non | échange | App Review |
| Haute | Slack | slack | non | non* | bot vs user token |
| Haute | HubSpot | hubspot | non | oui | scopes granulaires |
| Haute | Notion | notion | non | non | Basic auth, header version |
| Haute | Salesforce | salesforce | non | oui | instance_url |
| Haute | Zoom | zoom | non | oui | Basic auth |
| Moyenne | Pipedrive | pipedrive | non | oui | api_domain, Basic auth |
| Moyenne | Zendesk | zendesk | non | non | URL par subdomain |
| Moyenne | Intercom | intercom | non | non | — |
| Moyenne | Asana | asana | non | oui | — |
| Moyenne | Monday | monday | non | oui | — |
| Moyenne | ClickUp | clickup | non | non | — |
| Moyenne | Linear | linear | non | non | — |
| Moyenne | Calendly | calendly | non | oui | — |
| Moyenne | Atlassian (Jira) | atlassian | non | oui | audience + cloudid |
| Moyenne | Dropbox | dropbox | opt | oui | `token_access_type=offline` |
| Moyenne | Box | box | non | oui | — |
| Moyenne | DocuSign | docusign | non | oui | démo vs prod |
| Moyenne | QuickBooks | quickbooks | non | oui | realmId |
| Moyenne | Xero | xero | non | oui | `offline_access` |
| Moyenne | Discord | discord | non | oui | — |
| Basse | LinkedIn | linkedin | non | oui | — |
| Basse | Twitter/X | twitter | **oui** | oui | PKCE |
| Basse | Airtable | airtable | **oui** | oui | PKCE |
| Basse | GitLab | gitlab | rec. | oui | — |
| Basse | GitHub | github | non | opt | — |
| Basse | Shopify | shopify | non | non | URL par boutique |
| Basse | Figma / Miro / Webflow / Front / Typeform / Mailchimp / Stripe / Pennylane / Qonto / eBay / Close / Outreach / Salesloft / RingCentral / Aircall / Nextcloud | (resp.) | — | var. | voir fiches §5 |
| N/A | Trello | trello | — | — | **OAuth 1.0a → hors moteur OAuth2** |
| N/A | Klaviyo/Brevo/SendGrid/Mailgun/Postmark/Resend… | — | — | — | **clé API, garder tel quel** |

\* Slack : refresh seulement si « token rotation » activée.

---

## 7. Ordre de déploiement recommandé

1. **Meta** (vendor déjà câblé, env prêtes) → brancher FB/IG/WhatsApp.
2. **Vague « relation client »** alignée sur les besoins formation (modules 04/05) :
   Slack, HubSpot, Notion, Zendesk, Calendly.
3. **Vague « projet/productivité »** : Asana, Monday, ClickUp, Linear, Atlassian.
4. **Vague « fichiers/signature »** : Dropbox, Box, DocuSign.
5. **Vague « finance »** : QuickBooks, Xero, Stripe Connect, Pennylane, Qonto.
6. Les PKCE (Twitter/X, Airtable, GitLab) en dernier (vérifier le support `pkce` du Panel).

> Pour chaque vague : appliquer la **checklist §3**. Le plus gros du travail récurrent
> est côté **concentrateur (allowlist + mappe d'URLs)** et **création d'app chez l'éditeur** ;
> le manifest est un copier-coller du gabarit §4.
