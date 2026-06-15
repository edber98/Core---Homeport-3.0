# KINN Radar d'entreprise — Ultraplan

> **Vision** : le système nerveux numérique de l'entreprise. Pas un logiciel métier de plus —
> l'agent qui observe tous les logiciels (ERP, compta, CRM, mails, agenda, GED, fichiers,
> Teams…) et agit. Le dirigeant cesse d'être l'API humaine entre ses outils.
>
> Une secrétaire numérique 24/7 : elle observe en continu, comprend ce qui change,
> prépare le travail, demande validation, apprend les procédures de l'entreprise,
> et travaille la nuit pour synchroniser et réconcilier.

---

## 0. Faisabilité et briques existantes réutilisées

Le projet est faisable sur l'architecture actuelle de Homeport. Inventaire de ce qui est réutilisé tel quel ou étendu :

| Brique existante | Localisation | Usage dans le Radar |
|---|---|---|
| Agent harness (boucle LLM + tools + anti-loop/anti-hallucination) | `API/src/ai/agent-harness.js`, `ai/harness/` | Moteur d'exécution du superviseur et des missions |
| Jobs durables (checkpoint, resume, heartbeat, permissions) | `ai/jobs/job-runner.js`, `resume-worker.js`, `worker-process.js`, `job-events.js` | Missions de fond, travail de nuit, reprise après crash |
| Background runner | `ai/background-runner.js` | Spawn non-bloquant d'agents + notification Socket.IO |
| Subagents (roster, sub-runner, types) | `ai/subagent/` | Fan-out des missions (un agent mail + un agent compta + un croiseur) |
| Mailbox inter-agents | `ai/harness/mailbox.js` | Le superviseur peut injecter des messages dans des missions en cours |
| Router + spécialistes | `ai/router-agent.js`, `ai/specialists/` | Modèle pour le « radar-specialist » |
| Triggers polling avec diff d'état | `services/triggers/polling-trigger.js`, `base-trigger.js` | Pattern de détection de changements (généralisé en collecteurs) |
| Pattern « famille de connecteurs » | `db/models/ai-project-root.model.js` (`connectorType`) | Généralisé à toutes les familles (email, accounting, crm…) |
| Mémoire multi-niveaux + enrichissement | `ai-company-context.model.js` (avec `enrichmentHistory`), `ai-project-memory`, `memory-extractor-hook.js` | Connaissance entreprise, particularités (arborescence…), apprentissage |
| Onboarding conversationnel + création credential intégrée | `Homeport/features/ai/ai-onboarding-dialog.component.ts` + `credentials/credential-edit-dialog.component.ts` | Socle du wizard Radar |
| Composants UI structurés | `features/ai/structured/` (card-grid, timeline, stepped-plan, comparison-table, accordion), `widgets/` (actions, modal), `canvas/` | Catalogue de cards du dashboard dynamique |
| OAuth bouncer multi-tenant | auth.kinn.fr (relais de code, refresh local) | Connexion 1-clic des providers OAuth dans le wizard |
| Credentials chiffrés par workspace | `db/models/credential.model.js` (AES iv/tag/data) | Stockage des accès |
| Plugins providers (~dizaines de repos) | `API/src/plugins/repos/` | Capacités concrètes par logiciel (Odoo, Dolibarr, Gmail…) |
| Notifications + Socket.IO | `notification.model.js`, infra socket | Alertes temps réel |
| Niveaux d'autonomie | `ai/prompts/autonomy.js` (`prudent`/`balanced`/`autonomous`) | Autonomie par playbook |

**À construire** : familles généralisées + capability registry, collecteurs/snapshots/deltas, scheduler central, filtre de signifiance, superviseur auto-promptant, missions avec retry, RadarBoard (dashboard généré), playbooks, wizard Radar, base de connaissance entreprise étendue.

---

## 1. Architecture d'ensemble

```
                        ┌────────────────────────────────────────────────┐
                        │              WIZARD RADAR (§6)                 │
                        │  familles → credentials → calibrage → savoir   │
                        └───────────────┬────────────────────────────────┘
                                        ▼
┌──────────────────────────── PLAN DE CONTRÔLE ─────────────────────────────────┐
│  RadarConnector (par famille)   RadarKnowledge (particularités, arborescence) │
│  RadarPlaybook (procédures)     RadarPolicy (autonomie, fenêtres, quotas)     │
└───────────────┬───────────────────────────────────────────────────────────────┘
                ▼
┌──────────── BOUCLE 1 : OBSERVATION (radar-scheduler, continue) ───────────────┐
│  Collecteurs par famille (email 2-5min, accounting 1h, storage 15min, …)      │
│  → RadarSnapshot (baseline + hash) → RadarDelta (created/updated/overdue/…)   │
│  Fenêtre nocturne : full resync, réconciliation croisée, indexation PJ        │
└───────────────┬───────────────────────────────────────────────────────────────┘
                ▼
┌──────────── FILTRE DE SIGNIFIANCE (règles + LLM léger) ───────────────────────┐
│  bruit (newsletter, heartbeat) → ignoré | signal → RadarSignal + réveil       │
└───────────────┬───────────────────────────────────────────────────────────────┘
                ▼
┌──────────── BOUCLE 2 : SUPERVISEUR (agent radar, événementiel) ───────────────┐
│  Contexte : carte connecteurs + savoir + playbooks + deltas + missions        │
│  AUTO-PROMPTING : écrit lui-même la mission, les critères de succès,          │
│  la stratégie de retry → spawn RadarMission (AiJob) en fan-out                │
│  Auto-évaluation : critique du résultat, re-essai si critères non atteints    │
└───────────────┬───────────────────────────────────────────────────────────────┘
                ▼
┌──────────── BOUCLE 3 : ACTION & APPRENTISSAGE ────────────────────────────────┐
│  RadarBoard (dashboard server-driven, recomposé selon jour/mois/activité)     │
│  Propositions → Valider / Modifier / Refuser → exécution → feedback           │
│  Correction utilisateur → memory-extractor → RadarPlaybook                    │
└────────────────────────────────────────────────────────────────────────────────┘
```

Trois principes structurants :

1. **Le LLM ne poll jamais.** L'observation est du code déterministe (collecteurs + diff).
   Le LLM n'est réveillé que sur signal filtré — c'est ce qui rend le système viable en coût.
2. **Liberté encadrée par contrat.** Le superviseur écrit librement ses prompts de mission,
   choisit ses sous-agents, ré-essaye — mais toute action *sortante* (envoi, écriture chez un
   provider) passe par le contrat d'autonomie (validation humaine par défaut, autonomie
   accordée playbook par playbook).
3. **Tout est rejouable.** Chaque mission est un AiJob durable : crash → resume-worker reprend.

---

## 2. Familles de connecteurs & Capability Registry

### 2.1 Familles

Généralisation du pattern `AiProjectRoot.connectorType`. Une famille = un **contrat sémantique** : ce que le radar peut demander, indépendamment du logiciel concret.

| Famille | Exemples de providers | Capacités du contrat (extraits) |
|---|---|---|
| `storage` | Nextcloud, Drive, Dropbox, OneDrive, S3 | `listTree`, `readFile`, `moveFile`, `searchFiles` |
| `email` | Gmail, IMAP, Outlook | `listMessages(since)`, `getMessage`, `getAttachments`, `sendDraft` |
| `accounting` | Odoo, Dolibarr, QuickBooks, Pennylane | `listSupplierInvoices`, `listCustomerInvoices`, `listPayments`, `listPurchaseOrders`, `getCashPosition`, `createDraftInvoice` |
| `crm` | Odoo CRM, HubSpot, Pipedrive | `listOpportunities`, `listQuotes(status)`, `getLastActivity(contact)`, `createOpportunity` |
| `productivity` | Trello, Notion, ClickUp, Planner | `listTasks(filter)`, `createTask`, `listOverdue` |
| `calendar` | Google Calendar, CalDAV, Outlook | `listEvents(range)`, `createEvent` |
| `communication` | Slack, Teams, WhatsApp Business | `listChannels`, `searchMessages`, `postMessage`, `getMeetingRecordings` |
| `hr` | Lucca, PayFit, Odoo RH | `listEmployees`, `listAbsences`, `listContracts` |
| `monitoring` | logs, VPN, serveurs (phase tardive) | `listLoginEvents`, `listAnomalies` |

### 2.2 Implémentation

- **Manifest plugin** : nouveau bloc optionnel par provider :
  ```json
  {
    "radar": {
      "family": "accounting",
      "capabilities": {
        "listSupplierInvoices": { "template": "odoo_list_supplier_invoices", "args": { "limit": 200 } },
        "listPayments":         { "template": "odoo_list_payments" }
      },
      "watch": [
        { "entity": "supplier_invoice", "via": "listSupplierInvoices", "key": "id", "hashFields": ["state","amount_total"] },
        { "entity": "payment",          "via": "listPayments",         "key": "id" }
      ]
    }
  }
  ```
  Le mapping capacité → NodeTemplate réutilise le mécanisme des agents système `provider:xxx`
  (résolution des templates par provider déjà en place dans `resolveAgentOverrides`).
- **`capability-registry.js`** (nouveau, `API/src/radar/`) : à partir des manifests importés,
  expose `getCapability(workspaceId, family, capability)` → `{ template, credential, exec() }`.
  C'est la **seule porte** par laquelle collecteurs et missions touchent les providers.
- Un provider peut servir plusieurs familles (Odoo = accounting + crm + hr) : `radar` accepte
  un tableau de blocs.
- **Fallback générique** : si un provider n'a pas de bloc `radar`, le wizard propose un mapping
  semi-automatique — l'IA lit la liste des NodeTemplates du provider et propose les
  correspondances capacité → template, validées par l'utilisateur, stockées dans
  `RadarConnector.capabilityOverrides`. Aucun provider n'est bloquant.

### 2.3 Modèle `RadarConnector`

```js
// API/src/db/models/radar-connector.model.js
{
  workspaceId, family, providerKey, credentialId,
  label,                       // "Compta Odoo production"
  status: 'pending'|'active'|'error'|'paused',
  pollingPolicy: { intervalMs, nightlyFull: Boolean, quietHours: [h1,h2] },
  capabilityOverrides: Mixed,  // mapping manuel capacité → template
  scopeConfig: Mixed,          // ex: { mailboxes: ['compta@…'], folders: ['/Compta'] }
  lastPollAt, lastFullSyncAt, lastError,
  health: { consecutiveErrors, rateLimitedUntil }
}
```

---

## 3. Boucle d'observation : collecteurs, snapshots, deltas

### 3.1 Scheduler central (`API/src/radar/scheduler.js`)

- Un seul scheduler process-wide (node-cron ou boucle tick 30s, même pattern que
  `resume-worker`), qui parcourt les `RadarConnector` actifs et déclenche les collecteurs
  dont l'échéance est atteinte. Verrou Mongo (`lockedUntil` sur le connecteur) pour
  supporter plusieurs instances API.
- Politiques par défaut : `email` 3 min, `storage` 15 min, `accounting`/`crm` 60 min,
  `calendar` 30 min, `communication` 10 min. Ajustables par connecteur.
- **Fenêtre nocturne** (défaut 02:00–05:00, timezone du `AiCompanyContext`) :
  full resync de chaque connecteur, réconciliation croisée (§3.4), indexation/OCR des
  pièces jointes en retard, préparation du briefing du matin.
- Backoff exponentiel sur erreurs + respect `429` (`rateLimitedUntil`).

### 3.2 Collecteurs et snapshots

```js
// radar-snapshot.model.js — une ligne par entité observée
{
  connectorId, workspaceId, family,
  entityType,        // 'email_message' | 'supplier_invoice' | 'quote' | 'file' | …
  entityKey,         // id stable côté provider
  contentHash,       // hash des hashFields du manifest
  data: Mixed,       // payload normalisé (compact)
  firstSeenAt, lastSeenAt, lastChangedAt,
  deletedAt          // soft-delete si disparu du provider
}
```

Le collecteur (générique, par famille) :
1. appelle les capacités `watch` du connecteur via le capability-registry ;
2. normalise chaque entité (`entityKey`, `contentHash`) ;
3. compare au snapshot → produit des **`RadarDelta`** :
   `{ type: 'created'|'updated'|'deleted', entityType, before, after }` ;
4. la **première passe** est la baseline (ta « première boucle d'informations ») :
   snapshots écrits, **aucun delta émis**, mais un résumé statistique est donné au
   superviseur pour qu'il découvre le terrain (« 1 240 mails, 89 factures fournisseurs,
   12 devis ouverts »).

### 3.3 Deltas temporels (rien n'a changé, mais le temps passe)

Un évaluateur dédié (tick horaire) produit des deltas `overdue`/`approaching` à partir des
snapshots **sans appeler les providers** : devis sans réponse depuis N jours, contrat à
échéance dans 45 j, facture impayée, projet terminé non facturé, procédure qualité expirée.
Les seuils viennent des `RadarPolicy` (défauts sensés, modifiables par le superviseur quand
l'utilisateur dit « relance plutôt à 10 jours »).

### 3.4 Réconciliation croisée (nocturne)

Jobs déterministes qui croisent les snapshots inter-familles et émettent des deltas
synthétiques de haut niveau :
- pièces jointes facture (email) ↔ factures saisies (accounting) → `invoice_missing_in_books`
- temps saisis + BL signé (storage/productivity) ↔ factures client → `unbilled_project`
- série temporelle achats par catégorie → `unusual_spend` (z-score simple)
- CA par client sur 3 mois glissants → `revenue_drop_client`
- prévisionnel tréso (factures à encaisser/payer + récurrents) → `cash_forecast_alert`

C'est volontairement du code (ou du code généré une fois puis figé), pas du LLM à chaque
nuit : reproductible, gratuit, vérifiable.

---

## 4. Filtre de signifiance

Étage 1 — **règles** (gratuit, synchrone) : listes d'ignore (newsletters, no-reply,
notifications automatiques), seuils de montants, déduplication, rate-limit par source.

Étage 2 — **LLM léger** (Haiku/équivalent, batch toutes les ~2 min) : pour les deltas ambigus
(tout `email_message` créé, messages communication). Prompt court, sortie structurée :

```json
{ "significant": true, "category": "accounting_request", "urgency": "high",
  "summary": "L'expert-comptable demande si toutes les factures d'avril sont saisies",
  "entities": ["expert-comptable", "factures avril"] }
```

Sortie → **`RadarSignal`** `{ deltaIds[], category, urgency, summary, status: 'pending' }`.
Les signaux `urgency: low` sont agrégés et traités par lots (au prochain réveil planifié ou
au briefing du matin) ; `high` réveille le superviseur immédiatement.

---

## 5. Le superviseur : liberté, auto-prompting, retry

### 5.1 Nature

Un agent persistant **par workspace** (thread radar dédié + `radar-specialist.js` dans
`ai/specialists/`), réveillé par : signal filtré, calendrier métier (fin de mois, échéances
fiscales, lundi matin), fin d'une mission, question directe de l'utilisateur, ou message
mailbox. Entre deux réveils, il n'existe pas (pas de boucle LLM idle).

### 5.2 Contexte injecté à chaque réveil

1. **Carte des connecteurs** : familles actives, capacités disponibles, santé, dernière synchro.
2. **Savoir entreprise** (`RadarKnowledge`, §8) : arborescence des fichiers, conventions,
   contacts clés (qui est l'expert-comptable), particularités données au wizard.
3. **Playbooks** applicables à la catégorie du signal.
4. **Signaux en attente** + missions en cours/terminées depuis le dernier réveil.
5. **État du RadarBoard** actuel (pour le faire évoluer, pas le régénérer de zéro).
6. Date/heure, période métier (jour du mois, fin de trimestre…).

### 5.3 Auto-prompting des missions — le cœur de la liberté demandée

Le superviseur ne dispose **pas** de workflows codés en dur par cas d'usage. Il dispose
d'un méta-outil :

```
launch_mission({
  title: "Vérifier la complétude des factures d'avril",
  prompt: <écrit librement par le superviseur — objectif, contexte utile,
           capacités à utiliser, format de sortie attendu>,
  successCriteria: ["liste exhaustive des PJ factures des mails d'avril",
                    "croisement avec les factures saisies dans Odoo",
                    "chaque facture manquante a : fournisseur, montant, date, lien mail"],
  subagents: [ { role: "email-miner", prompt: "..." },
               { role: "books-reader", prompt: "..." } ],   // fan-out optionnel
  maxAttempts: 3,
  deadline: "avant 18h",
  budget: { maxToolCalls: 60 }
})
```

Mécanique d'exécution (`radar/mission-runner.js`, au-dessus de `createJob`) :

1. Chaque mission/sous-agent = un **AiJob** (durable, resumable, heartbeat — existant).
2. Les sous-agents n'ont accès qu'aux capacités des familles citées + tools de lecture
   (moindre privilège).
3. À la fin, un **passage critique** : un agent évaluateur (léger) vérifie le résultat
   contre `successCriteria`. Non atteints → le superviseur est réveillé avec la critique,
   **réécrit le prompt** (c'est son retry : reformuler, découper autrement, changer de
   capacité, élargir la fenêtre de recherche) et relance, jusqu'à `maxAttempts`.
4. Échec final → card `mission_failed` sur le board avec ce qui a été tenté et ce qui bloque
   (souvent : une question à poser à l'utilisateur — qui devient une card `question`).
5. Le superviseur peut interroger/interrompre une mission en cours via la **mailbox**
   (existante) — ex. nouvelle info arrivée entre-temps.

Autres méta-outils du superviseur : `update_board` (§6), `ask_user`, `save_knowledge`,
`create_playbook` / `update_playbook`, `schedule_wakeup` (se replanifier : « re-vérifier
dans 3 jours si le client a répondu »), `adjust_policy` (seuils, intervalles — borné),
`send_notification`.

`schedule_wakeup` est stocké en **`RadarWakeup`** `{ workspaceId, at, reason, payload }`
et honoré par le scheduler central — c'est ce qui donne au radar sa mémoire prospective
(« je me rappelle de vérifier »).

### 5.4 Garde-fous (la liberté sans le chaos)

- Réutilisation directe de `harness/anti-loop.js`, `anti-hallucination.js`, budgets de tools.
- Plafonds par workspace : missions concurrentes (3 par défaut), réveils/heure, tokens/jour
  (`RadarPolicy`). Dépassement → dégradation douce (agrégation des signaux, file d'attente).
- Actions **sortantes** uniquement via tools `propose_*` (qui créent une card de validation)
  — sauf playbook avec autonomie accordée explicitement (§7).
- Journal d'activité complet (`RadarActivity`) : chaque réveil, décision, mission, coût —
  consultable dans l'UI (« qu'as-tu fait cette nuit ? » répond depuis ce journal).

---

## 6. RadarBoard — le dashboard généré, différent chaque jour

### 6.1 Principe : server-driven UI sur catalogue fermé

L'IA compose, Angular rend. Le board est un document JSON versionné :

```js
// radar-board.model.js
{
  workspaceId, generatedAt, generatedBy: 'supervisor'|'nightly'|'user_refresh',
  periodContext: { dayOfMonth, isMonthEnd, isMorning, … },
  sections: [
    { title: "À traiter maintenant", cards: [cardId, …] },
    { title: "Cette semaine", cards: […] },
    { title: "Chiffres du mois", cards: […] }   // sections libres, décidées par l'IA
  ]
}
// radar-card.model.js — cycle de vie indépendant du board
{
  workspaceId, type, payload, state: 'open'|'validated'|'modified'|'dismissed'|'expired'|'done',
  missionId?, signalIds?, priority, expiresAt, userResponse?
}
```

### 6.2 Catalogue de cards (composants Angular, plusieurs déjà existants)

| Type | Contenu | Base existante |
|---|---|---|
| `briefing` | Synthèse du matin (cas n°15) | nouveau (texte riche) |
| `action_proposal` | Proposition + pièces jointes + boutons Valider / Modifier / Refuser | `widgets/ai-widget-actions` |
| `question` | Question du radar, la réponse alimente `RadarKnowledge` | `ai-question.component` |
| `alert` | Risque client, sécurité, trésorerie — avec score et justification | nouveau |
| `kpi_dashboard` | Chiffres facturation/encaissements, mini-graphes | `structured/card-grid` + charts |
| `checklist` | Plan d'actions (cas départ salarié : « 14 actions ») | `structured/stepped-plan` |
| `comparison` | Croisements (factures mails vs compta) | `structured/comparison-table` |
| `timeline` | Historique d'un dossier, relances | `structured/timeline` |
| `digest` | « Cette nuit j'ai… » | nouveau (depuis `RadarActivity`) |
| `document_preview` | Visualisation des PJ avant envoi | exec-result-viewer / canvas-files |
| `mission_status` | Mission en cours/échouée, avancement | `canvas-workplan` |

Le superviseur manipule le board via `update_board({ addCards, updateCards, removeCards,
reorderSections })` — il fait **évoluer** le board (les cards ont leur vie propre), il ne le
régénère pas entièrement, sauf recomposition quotidienne du matin. C'est ce qui fait que
l'interface est différente selon le jour, le mois, l'activité : en fin de mois le superviseur
ajoute une section chiffres ; un matin à urgence il met la card `alert` en tête.

### 6.3 Boucle de validation

`Valider` → exécution de l'action préparée (mission d'exécution courte, via les capacités
d'écriture) → card passe `done` + trace. `Modifier` → l'utilisateur ajuste (texte du mail,
liste des documents) → exécution de la version modifiée → **le diff entre proposé et modifié
part au memory-extractor** (apprentissage, §7). `Refuser` (avec raison optionnelle) → signal
négatif mémorisé (« ne pas relancer ce client automatiquement »).

Frontend : nouvelle feature `Homeport/src/app/features/radar/` — page `/radar` (le panel
entreprise), rendu des cards par `type`, updates temps réel par Socket.IO
(`radar.board.updated`, `radar.card.updated`), badge d'alertes dans le header.

---

## 7. Playbooks — les procédures apprises (« pro systems »)

```js
// radar-playbook.model.js
{
  workspaceId,
  name: "Client mécontent",
  triggerSpec: { categories: ['client_complaint'], conditions: "score colère > 70" },
  procedure: "1. Notifier immédiatement Edouard (push)…\n2. Préparer un brouillon d'excuse…\n3. Créer une tâche de rappel à 24h…",
  autonomy: 'propose' | 'auto_with_report' | 'full_auto',   // par étape possible
  source: 'user_taught' | 'learned_from_corrections' | 'suggested_by_radar',
  stats: { timesUsed, lastUsedAt, overrideCount },
  enabled: true
}
```

- **Cycle d'apprentissage** : situation sans playbook → le radar traite prudemment + demande
  « la prochaine fois, comment veux-tu que je gère ça ? » (card `question`) → la réponse est
  compilée en playbook (hook sur le pattern `memory-extractor-hook` existant) → occurrences
  suivantes traitées selon le playbook.
- **Apprentissage passif** : 3 corrections similaires de l'utilisateur (via `Modifier`) →
  le radar **propose** un playbook (« je remarque que tu reformules toujours mes relances
  ainsi — j'en fais une règle ? »). Jamais de création silencieuse.
- Les playbooks applicables sont injectés dans le contexte du superviseur (sélection par
  catégorie du signal) et leur `procedure` est suivie comme consigne prioritaire.
- UI de gestion dans `/radar/settings` : liste, édition du texte de procédure (c'est du
  langage naturel — l'utilisateur peut écrire/modifier lui-même), niveau d'autonomie par
  playbook, activation/désactivation, stats d'usage.
- `full_auto` exige une confirmation explicite à la création **et** produit toujours une
  card `digest` (rien d'invisible).

---

## 8. RadarKnowledge — le savoir entreprise (particularités)

`AiCompanyContext` reste le profil général. S'y ajoute une base factuelle structurée :

```js
// radar-knowledge.model.js
{
  workspaceId,
  topic: 'file_structure' | 'contacts' | 'conventions' | 'processes' | 'business_rules' | 'custom',
  key:   "arborescence factures fournisseurs",
  value: "Les factures fournisseurs sont classées dans /Compta/Fournisseurs/{ANNEE}/{MOIS}/, nommées {FOURNISSEUR}_{YYYYMMDD}_{MONTANT}.pdf",
  source: 'wizard' | 'user_answer' | 'radar_discovery' | 'user_spontaneous',
  confidence: 'confirmed' | 'inferred',
  verifiedAt
}
```

- Alimenté par : le wizard (§9), les réponses aux cards `question`, le tool `save_knowledge`,
  et la **découverte** (le radar explore l'arborescence la première nuit et propose sa
  compréhension : « je vois que tes factures semblent rangées par année/mois — c'est bien
  ça ? » → confirmation passe `inferred` → `confirmed`).
- Injecté sélectivement dans les missions (le superviseur cite les entrées pertinentes dans
  le prompt de mission qu'il écrit — ex. l'arborescence pour une mission d'archivage).
- Les entrées `inferred` jamais confirmées et contredites par les faits sont re-questionnées.
- UI : onglet « Ce que KINN sait de l'entreprise » dans `/radar/settings`, éditable —
  transparence totale sur le savoir, correction directe possible.

---

## 9. Le wizard Radar — configuration simple, conversationnelle

Objectif : un dirigeant non technique connecte son entreprise en < 15 minutes.

Base existante : `ai-onboarding-dialog.component.ts` (chat + `CredentialEditDialogComponent`
embarqué) + OAuth bouncer (connexion OAuth = 1 clic, pas de saisie de clés pour Google,
Microsoft…). Le wizard Radar est une page dédiée `/radar/setup`, **hybride** : une trame
d'étapes visuelles pilotée par un agent conversationnel (`radar-setup` specialist).

**Étape 1 — Profil entreprise (2 min).** Conversation courte : activité, taille, qui fait
quoi (qui gère la compta ? externe ? son email ?). → `AiCompanyContext` + `RadarKnowledge`
(topic `contacts`).

**Étape 2 — Les familles, une par une.** Grille des familles avec état (connectée / à faire /
ignorée). Pour chaque famille : « Quel outil utilises-tu pour ta comptabilité ? » → liste
des providers disponibles ayant cette famille (+ recherche). Sélection → credential :
- OAuth → bouton « Connecter » (bouncer, 1 clic) ;
- API key → le wizard affiche un mini-guide par provider (où trouver la clé, avec captures)
  + le formulaire credential existant ;
- **Test immédiat** : le wizard exécute une capacité de lecture anodine et montre un échantillon
  réel (« je vois 12 factures en avril, dont ABC pour 2 542 € — c'est bien ton Odoo ? »).
  C'est le moment de confiance clé du wizard.

**Étape 3 — Calibrage par famille (les particularités).** Questions ciblées, conversationnelles,
par famille connectée :
- `storage` : « Montre-moi où sont rangées tes factures » → mini-explorateur de fichiers
  (réutilise le pattern `cachedTree` d'AiProjectRoot) où l'utilisateur navigue et désigne ;
  l'IA verbalise la convention et la fait confirmer → `RadarKnowledge(file_structure)`.
- `email` : quelles boîtes surveiller, expéditeurs importants (expert-comptable…),
  ce qu'il ne faut jamais toucher.
- `accounting` : journal des achats, qui saisit, jour de clôture mensuelle.
- Chaque réponse = une entrée `RadarKnowledge(source: 'wizard')`.

**Étape 4 — Règles du jeu.** Niveau d'autonomie global de départ (recommandé : tout en
validation), canaux de notification (in-app, push, email), fenêtre nocturne, fréquence du
briefing matinal.

**Étape 5 — Baseline & découverte.** Lancement de la première synchro (progression visible
par famille). Pendant la baseline, le radar fait sa découverte (§8) et pose ses 2-3 questions
d'éclaircissement. Fin → premier RadarBoard : un `briefing` de bienvenue + un `digest` de ce
qu'il a vu + d'éventuelles premières détections (« j'ai déjà repéré 2 devis de plus de 15
jours sans réponse »). **Effet wahou immédiat** : le produit démontre sa valeur à la minute 16.

Le wizard est **réentrant** : ajouter une famille plus tard = revenir sur la grille ; le radar
peut lui-même suggérer (« je vois passer des mails Trello — veux-tu connecter Trello ? »).

---

## 10. Les 15 cas d'usage mappés sur l'architecture

| # | Cas | Mécanisme |
|---|---|---|
| 1 | Facture fournisseur reçue par mail | Collecteur email → signifiance `accounting_request` → mission auto-promptée : extraction PJ + OCR (capacité `document`), lookup fournisseur/BC/réception via `accounting` → card `action_proposal` « Prête à comptabiliser » ou `alert` « pas de BC associé » |
| 2 | Client silencieux (devis 15 j) | Delta temporel `quote_overdue` (snapshots crm, sans LLM) → mission : croiser avec emails/appels → card `action_proposal` relance pré-rédigée + montant en jeu |
| 3 | Client en colère | Filtre de signifiance étage 2 sur emails entrants (score) → signal `client_complaint` urgence haute → playbook s'il existe, sinon notification + card `alert` + question d'apprentissage |
| 4 | Départ d'un salarié | Signal (mail démission ou saisie RH) → mission fan-out : projets ouverts (productivity), dossiers (storage), clients (crm), accès (knowledge) → card `checklist` « 14 actions avant départ » |
| 5 | Perte d'un gros client (−37 % / 3 mois) | Réconciliation nocturne `revenue_drop_client` → mission d'analyse (commandes, mails, tickets) → card `alert` avec hypothèses |
| 6 | Risque de trésorerie à 47 j | Réconciliation nocturne `cash_forecast` (devis + commandes + factures + encaissements) → card `kpi_dashboard` + `alert` si négatif |
| 7 | Contrat qui expire | Indexation nocturne des PDF (storage/GED) extrait les dates d'échéance → `RadarKnowledge` + delta temporel `approaching` → card `alert` à J-45 |
| 8 | Achat anormal (visserie ×8) | Réconciliation nocturne `unusual_spend` (z-score sur historique snapshots) → card `alert` avec comparatif |
| 9 | Facture client oubliée | Réconciliation `unbilled_project` (temps saisis + BL signé, 0 facture) → card `action_proposal` brouillon de facture |
| 10 | Réunion intelligente (Teams) | Collecteur `communication` détecte un enregistrement → mission : transcription → tâches/échéances/risques → cards + création tâches (après validation) |
| 11 | Détection des pertes de temps | Analyse mensuelle nocturne des patterns (mails répétitifs, recopies) → card `suggestion` proposant un flow Homeport (pont naturel vers le builder existant !) |
| 12 | Contrôle qualité documentaire | Capacité storage + règles `RadarKnowledge(processes)` (versions, signatures, validité) → deltas `overdue` → card `checklist` non-conformités |
| 13 | Détection d'opportunités | Signifiance sur mails (« nous ouvrons un nouvel atelier ») → signal `opportunity` → card `action_proposal` création d'opportunité CRM |
| 14 | Surveillance cybersécurité | Famille `monitoring` (phase tardive) → deltas `login_anomaly` → card `alert` |
| 15 | Assistant dirigeant (briefing matinal) | Réveil calendaire quotidien → le superviseur compose le briefing depuis signaux agrégés + missions + chiffres → recomposition du board + notification |

**Aucun de ces cas n'est codé en dur** : 1, 3, 4, 10, 13 sont entièrement émergents
(signal → auto-prompting) ; 2, 7, 12 = deltas temporels paramétrés ; 5, 6, 8, 9, 11 =
réconciliations nocturnes qui produisent des deltas que le superviseur interprète librement.
Ajouter un « cas n°16 » ne demande aucun développement — c'est la conséquence directe de la
liberté d'auto-prompting demandée.

---

## 11. Sécurité, confiance, multi-tenant

- **Isolation stricte par workspace** : tous les nouveaux modèles portent `workspaceId`
  (même pattern que Flow/Form/Credential). Un superviseur par workspace, jamais de données
  croisées.
- **Moindre privilège** : missions limitées aux capacités citées dans leur contrat ;
  capacités d'écriture (`sendDraft`, `createTask`…) marquées `requiresApproval` au registry —
  utilisables seulement après validation de card ou playbook `auto`.
- **Auditabilité** : `RadarActivity` journalise chaque réveil/décision/mission/action/coût ;
  l'utilisateur peut demander « pourquoi as-tu fait ça ? » et le radar répond depuis le journal.
- **Kill switch** : pause globale du radar (un toggle), pause par connecteur, pause par playbook.
- Secrets : aucun changement — credentials chiffrés existants, OAuth refresh via bouncer.

## 12. Coûts & performance

- **Budget LLM maîtrisé par construction** : observation = 0 token ; filtre étage 2 = modèle
  léger sur les seuls deltas ambigus ; superviseur = réveils événementiels bornés
  (`RadarPolicy.maxWakeupsPerHour`, `dailyTokenBudget` avec dégradation douce : agrégation,
  report au briefing).
- **Compteur IA existant** (cf. branche `feature/credit-ia-panel`) : les missions radar
  consomment les mêmes crédits → modèle économique direct (le radar est un consommateur de
  crédits premium, plafonnable par offre).
- Mongo : index `{workspaceId, connectorId, entityType, entityKey}` sur snapshots ; TTL sur
  deltas consommés (30 j) et activité (90 j) ; snapshots compactés (payload normalisé minimal,
  les détails sont re-fetchés à la demande par les missions).

## 13. Phasage de réalisation

**Phase 1 — Socle connecteurs & familles** *(sans LLM)*
`radar-connector.model`, bloc `radar` au manifest + importer + validator, `capability-registry.js`,
routes CRUD `/api/radar/connectors`, début de la page `/radar/settings`.
Pilotes : Odoo (accounting+crm), un email (Gmail ou IMAP), Nextcloud (storage).

**Phase 2 — Observation**
`scheduler.js`, collecteurs génériques, `radar-snapshot` + `radar-delta`, baseline, deltas
temporels, fenêtre nocturne (resync seul). Écran de santé des connecteurs.

**Phase 3 — Signifiance + Superviseur minimal**
Filtre 2 étages, `radar-signal`, `radar-specialist` + méta-outils (`launch_mission`,
`ask_user`, `save_knowledge`, `schedule_wakeup`, `send_notification`), `mission-runner`
sur AiJob avec critique + retry. Sortie = notifications + réponses en chat (pas encore de board).
**→ premier moment de valeur réel : cas n°1 et n°2 fonctionnent.**

**Phase 4 — RadarBoard**
Modèles board/cards, `update_board`, page `/radar`, rendu des types de cards (en réutilisant
`structured/` et `widgets/`), boucle Valider/Modifier/Refuser, Socket.IO temps réel,
briefing matinal (cas n°15).

**Phase 5 — Wizard**
`/radar/setup` complet (étapes 1→5), mini-explorateur d'arborescence, test de connexion
avec échantillon réel, baseline avec découverte + questions.

**Phase 6 — Apprentissage**
`radar-playbook`, cycle enseignement/passif, autonomie par playbook, UI de gestion,
`radar-knowledge` UI (« ce que KINN sait »).

**Phase 7 — Réconciliations avancées & cas longue traîne**
Tréso prévisionnelle, dérive CA client, achats anormaux, facturation oubliée, OCR/indexation
PJ nocturne, contrats à échéance, réunions Teams, suggestions d'automatisation (cas n°11 →
pont vers le builder de flows). Famille `monitoring` en dernier.

Chaque phase est livrable et démontrable indépendamment ; les phases 1–3 forment le MVP
technique, 4–5 le produit montrable à un client, 6–7 le fossé concurrentiel.

## 14. Risques & parades

| Risque | Parade |
|---|---|
| Coût LLM dérive sur workspace actif | Filtre 2 étages, budgets/plafonds `RadarPolicy`, agrégation, crédits IA existants comme garde-fou commercial |
| Rate limits providers (Gmail…) | Politiques par famille, backoff, `rateLimitedUntil`, sync incrémentale (`since`) |
| Faux positifs → perte de confiance | Tout en validation au départ ; le refus est un signal mémorisé ; scores affichés avec justification |
| Hallucination dans une mission | `successCriteria` + agent critique + les chiffres affichés proviennent des snapshots/capacités (données réelles), jamais du texte libre du LLM |
| Baseline énorme (10 ans de mails) | Fenêtre initiale bornée (90 j par défaut, extensible), approfondissement nocturne progressif |
| Multi-instance API | Verrous Mongo sur connecteurs et jobs (pattern resume-worker existant) |
| Vie privée / RGPD | Scoping explicite au wizard (boîtes/dossiers surveillés), pas de stockage du corps complet des mails dans les snapshots (méta + résumé), journal d'accès |

---

*Document généré le 11/06/2026 — base : audit du code Homeport 1.0 (API/src/ai, services/triggers, plugins, features/ai).*
