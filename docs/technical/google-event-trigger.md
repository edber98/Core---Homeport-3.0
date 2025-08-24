# Déclencheurs d’événements — exemples (Gmail, Telegram, …)

Objectif: fournir des exemples d’Event Trigger côté UI et les grandes lignes backend pour connecter des providers (Gmail, Telegram, etc.), s’abonner aux événements, et démarrer un flow quand un événement survient (email reçu, message reçu, webhook HTTP, …).

Note: Gmail est un exemple représentatif, la même logique s’applique à d’autres providers (Telegram, Slack, Stripe, GitHub…).

## Seed côté UI (catalog)

- Provider `gmail` (exemple):
  - `hasCredentials: true`, `allowWithoutCredentials: false`.
  - `credentialsForm` (Dynamic Form):
    - `accountEmail` (text)
    - `clientId` (secret)
    - `clientSecret` (secret)
    - `refreshToken` (secret)
    - `redirectUri` (text, défaut `https://localhost/oauth2/callback`)

- Identifiants (exemple) en workspace `default`:
  - `id: cred_gmail_demo`, `name: Compte Gmail Demo`, `providerId: gmail`.
  - `values` contient les clés ci‑dessus (valeurs de démonstration).

- Node Template (type `event`) « Recevoir un mail »:
  - `id: tmpl_gmail_event_mail`, `appId: gmail`, `category: Google`.
  - `name: Gmail_OnEmailReceived` (identifiant technique, sans espaces).
  - `title: Recevoir un mail`, `subtitle: Gmail`, `icon: fa-solid fa-envelope`.
  - `args` (facultatif): `label` (INBOX), `query` (filtre Gmail).

Dans la palette, ce nœud est start‑like (pas d’entrée) et expose une sortie `out`. Un point vert dans la liste indique un déclencheur (start/event/endpoint) avec un tooltip explicatif.

### Autres exemples d’événements

- Provider `telegram` (exemple):
  - `hasCredentials: true`.
  - `credentialsForm` minimal: `botToken` (secret).
  - Event template: `Message reçu` (`tmpl_telegram_event_message`, type `event`, `appId: telegram`) avec args `chatId` (facultatif) et `filter` (facultatif).

- Provider `slack` (idée):
  - Credentials: `botToken` (secret).
  - Event: `Reaction ajoutée` (via Events API + webhook).

- Provider `stripe` (idée):
  - Credentials: `webhookSecret` (secret).
  - Event: `Payment succeeded` (via webhook endpoint → type `endpoint`).

## Logique backend — principes (Gmail)

Le backend est responsable de:

1) Gestion OAuth et stockage des identifiants
   - Échange du `code` OAuth contre `access_token` + `refresh_token`.
   - Rafraîchissement périodique du token (via `refresh_token`).
   - Stockage chiffré côté serveur (les champs secrets ne remontent jamais au client une fois enregistrés).

2) Abonnement aux événements (Gmail) — mode recommandé
   - Utiliser l’API Gmail `users.watch` (push) couplée à Google Cloud Pub/Sub.
   - Backend crée/renouvelle le `watch` par compte (scopes requis: `https://www.googleapis.com/auth/gmail.readonly` a minima).
   - Un abonnement Pub/Sub envoie des notifications HTTP vers une route publique du backend (ex: `POST /webhooks/google/gmail`).

3) Réception & normalisation
   - Endpoint de webhook valide la signature/headers Google (si configuré) et récupère `historyId`.
   - Le backend appelle ensuite `users.history.list` pour l’intervalle `[lastHistoryId, newHistoryId]` et reconstruit les nouveaux messages.
   - Pour chaque message entrant, le backend construit un `payload` normalisé (ex: `from`, `to`, `subject`, `snippet`, `messageId`, `threadId`, `labelIds`, `ts`, `rawHeaders`, `bodyParts`).

4) Démarrage du flow
   - Résout les flows dont le premier nœud est un `event` associé à `appId: gmail` et au workspace courant (ACL).
   - Démarre l’exécution avec un `context` initial: `{ event: { provider: 'gmail', type: 'email.received', data: <payload> } }`.
   - Le nœud suivant (après l’event) peut utiliser `context.event.data.*`.

## Contrats & structures suggérées

- Credentials `gmail` (server‑side secure shape):
```
{
  accountEmail: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  redirectUri?: string
}
```

- Webhook d’entrée (Pub/Sub → backend):
```
POST /webhooks/google/gmail
{
  message: { data: base64, messageId: string, publishTime: string },
  subscription: string
}
```

- Événement normalisé injecté dans le flow:
```
{
  provider: 'gmail',
  type: 'email.received',
  workspaceId: string,
  credentialId: string,
  data: {
    id: string,
    threadId: string,
    from: string,
    to: string,
    subject: string,
    snippet: string,
    labelIds: string[],
    ts: number,
    headers?: Record<string,string>,
    parts?: Array<{ mime: string, size: number, content?: string }>
  }
}
```

## Points d’implémentation backend

- Stockage et rotation du `historyId` par compte pour éviter les trous.
- Ré‑essais et idempotence: dédupliquer par `messageId`.
- Sécurité: vérification d’origine (Google) et de l’abonnement avant exécution du flow.
- Multi‑workspaces: rattacher chaque credential à un workspace et ne déclencher que les flows du même workspace.
- Observabilité: tracer `credentialId`, `flowId`, latence de traitement, erreurs.

## Limitations et alternatives

- Environnements sans Pub/Sub: fallback IMAP IDLE côté backend (long‑polling), moins robuste.
- Quotas Gmail: prévoir backoff et surveillance des erreurs 429/5xx.

Cette page décrit le contrat et les flux attendus. Le front embarque le seed (providers + forms + templates + credentials) pour prototyper l’expérience; la connexion réelle nécessite la mise en place des routes et de l’abonnement côté serveur. Gmail et Telegram sont fournis comme exemples, mais n’importe quel provider d’événements peut suivre ces patrons.
