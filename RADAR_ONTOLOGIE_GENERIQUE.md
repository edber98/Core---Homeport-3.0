# KINN Radar — Ontologie universelle & connectabilité générique

> Objectif : que le cerveau du Radar fonctionne pour **TOUTES** les catégories de
> logiciels (compta, CRM, agenda, productivité, fichiers, communication, support,
> RH, code/DevOps, monitoring…), et qu'**ajouter un plugin = le rendre connectable**
> sans rien coder en dur par logiciel. On a Dolibarr (ERP de test, à la place de
> SAP), Nextcloud (fichiers + lecture de contenu), GitLab (repos)… et tout ce qui
> viendra.
>
> Principe directeur : **on ne crée pas un modèle Mongo par type d'entité**
> (impossible à généraliser). On crée UNE entité générique + UN registre
> d'ontologie (des données, pas du code) + UN système de mapping appris. Ajouter
> un type d'entité = ajouter une ligne au registre, jamais un nouveau modèle.

---

## 1. Le cœur : une ontologie à 2 niveaux (générique mais pas vague)

Le piège est de tomber soit dans le trop-spécifique (un type par concept de chaque
logiciel → ingérable), soit dans le trop-vague (« tout est une chose »). La bonne
réponse : **8 types-noyaux universels** (le squelette commun à toute entreprise) +
des **sous-types** (la spécialisation) + des **rôles** (multi-étiquettes).

### Les 8 types-noyaux (`coreType`)

| coreType | Définition | Sous-types (exemples) | Champs canoniques |
|---|---|---|---|
| **Party** | Une personne ou une organisation | person, organization | name, email, phone, identifiers{siret,vat,domain}, roles[] |
| **Project** | Un conteneur de travail / de valeur | project, deal, repository, campaign, case | title, status, owner, startDate, dueDate, value |
| **WorkItem** | Quelque chose à faire / suivre | task, subtask, ticket, issue, merge_request, lead, milestone | title, status, assignee, priority, dueDate, createdAt |
| **Transaction** | Un mouvement de valeur / argent | invoice, payment, order, quote, credit_note, expense, bank_tx | number, amount_total, currency, state, payment_state, date, party |
| **Document** | Un fichier / artefact | file, attachment, contract, invoice_pdf, report, page | name, path, mimeType, size, modifiedAt, owner, hasContent |
| **Event** | Un point/période dans le temps | calendar_event, meeting, deadline, pipeline_run, deployment, commit, absence | title, start, end, allDay, status, location, actor |
| **Communication** | Un échange | email, chat_message, comment, call, note | from, to, subject, snippet, channel, threadId, sentAt |
| **Asset** | Une ressource gérée par l'entreprise | machine, product, license, server, folder, contract_asset | name, type, status, owner, location, attributes |

Chaque entité réelle est un `(coreType, subtype, roles[])`. Exemples :
- Une facture fournisseur Dolibarr → `Transaction / invoice / [supplier_invoice]`
- Une MR GitLab → `WorkItem / merge_request / []`, reliée au repo
- Un PDF dans Nextcloud → `Document / file / []` (puis classé `invoice_pdf` après lecture de contenu)
- Christophe Royen (ITBS) → `Party / person / [contact, supplier_rep]`
- ITBS (it-bs.fr) → `Party / organization / [supplier]`
- Un événement agenda → `Event / calendar_event / []`

### Les rôles (`roles[]`, multi-valués)
Un même Party peut être à la fois `client` ET `supplier` ET `employee`. Les rôles
sont des étiquettes appliquées par le contexte (un partenaire qui te facture ET que
tu factures). Vocabulaire : client, supplier, prospect, employee, partner, contact,
author, assignee, attendee, owner, user.

---

## 2. Le vocabulaire de relations (universel, fermé)

Les relations sont **génériques et qualifiées par un rôle** — pas une relation par
logiciel. Catalogue fermé (extensible au registre) :

| Relation | Sens | Exemple |
|---|---|---|
| `party_of` (role) | un acteur impliqué | invoice —party_of(billed_to)→ Party(client) |
| `part_of` / `child_of` | hiérarchie / appartenance | subtask —child_of→ task ; file —child_of→ folder ; MR —part_of→ repo |
| `derived_from` | dérivation métier | invoice —derived_from→ order —derived_from→ quote |
| `attached_to` | pièce jointe / rattachement | Document(attachment) —attached_to→ Communication(email) |
| `references` / `relates_to` | lien générique | ticket —references→ invoice |
| `assigned_to` | affectation | task —assigned_to→ Party(employee) |
| `scheduled_for` | dans le temps | Event —scheduled_for→ (timestamp) |
| `mentions` | citation | email —mentions→ Party / Project |
| `blocks` / `depends_on` | dépendance | issue —depends_on→ MR |
| `located_in` | emplacement | Asset(machine) —located_in→ site |

Le graphe = ces relations. Le suivi de processus (Devis→Commande→Livraison→
Facture→Paiement) est une **chaîne de `derived_from` + transitions d'état des Event**.

---

## 3. LES MODÈLES À CRÉER (la réponse à « tous les modèles »)

Volontairement **peu de modèles, tous génériques**. Aucun modèle par type métier.

### 3.1 `RadarOntologyType` — le registre (données, pas code)
```js
{ key,                       // ex: "transaction.invoice"
  coreType,                  // "Transaction"
  subtype,                   // "invoice"
  label,                     // "Facture"
  canonicalFields: [ { name, type, required, description } ],  // schéma pivot
  defaultRelations: [ ... ], // ex: party_of(billed_to), derived_from(order)
  category }                 // famille radar d'origine (accounting…)
```
C'est LUI qu'on enrichit pour supporter un nouveau type d'entité — **jamais un
nouveau modèle Mongo**. Seedé avec les ~40 sous-types de la §1, extensible à chaud
(par toi, ou proposé par le LLM lors d'un mapping inédit).

### 3.2 `RadarEntity` — l'entité générique (le nœud du graphe)
```js
{ id, workspaceId,
  coreType, subtype, roles: [String],
  canonicalKey,              // clé stable cross-connecteurs (siret|email|hash)
  label,
  attributes: Mixed,         // les champs canoniques remplis (schéma souple)
  sources: [ { connectorId, providerKey, externalId, rawHash } ],  // d'où elle vient (multi)
  firstSeenAt, lastSeenAt, lastChangedAt }
```
Une entité = un nœud, **dé-dupliqué** : la même société vue dans Dolibarr + les
mails + un dossier Nextcloud = UN `RadarEntity` avec 3 `sources`. Index sur
`(workspaceId, coreType, subtype)` et `(workspaceId, canonicalKey)`.

### 3.3 `RadarRelation` — l'arête du graphe
```js
{ id, workspaceId, fromId, toId, type, role, confidence,
  source (rule|llm|user), evidence: [ ... ], createdAt }
```
Index sur `fromId`, `toId`, `(workspaceId, type)`. Le graphe se parcourt par
voisinage (sous-graphe d'une entité) sans re-fetch des providers.

### 3.4 `RadarMapping` — l'adaptateur appris (raw → ontologie)
```js
{ id, workspaceId|null,      // null = mapping global (vaut pour tous les workspaces)
  providerKey, rawEntityType,// ex: "dolibarr" / "supplier_invoice"
  target: { coreType, subtype },
  fieldMap: { amount_total: "total_ttc", date: "datef", party: "socid", state: "statut" },
  valueMap: { state: { "1":"draft","2":"posted","3":"paid" } },
  keyField,                  // champ → canonicalKey
  relationRules: [ { type, role, viaField, targetType } ],  // ex: socid → party_of(billed_to) Party
  contentRule: null|{...},   // pour Document : faut-il lire le contenu, comment l'extraire
  version, checksum,         // checksum des champs sources → détection de dérive
  learnedBy (manual|llm), confidence, status (active|draft|deprecated) }
```
**Déterministe à l'exécution.** C'est le seul endroit qui connaît les spécificités
d'un logiciel. Tout le reste du Radar ne voit que l'ontologie.

### 3.5 `RadarDocumentContent` — contenu de fichier (permissionné, séparé)
```js
{ id, workspaceId, entityId,      // → RadarEntity Document
  text,                           // texte extrait (PDF/docx) ou OCR (images)
  extractedAt, method (text|ocr|none), bytes, truncated, ttlAt }
```
Séparé des métadonnées : on observe TOUJOURS les métadonnées (nom/taille/date),
mais le **contenu** n'est lu/stocké que si l'utilisateur l'autorise (cf. §6).

### 3.6 Modèles du cerveau (rappel, plan précédent)
`RadarFeedback` (dataset des décisions), `RadarModel` (registre des modèles k-NN/
forecasting), + `RadarRiskModel`/`RadarRelevanceModel`/`RadarProcess` (phases E/F).
Ils opèrent **sur l'ontologie**, donc valables pour toutes les catégories d'emblée.

> Total : **6 modèles génériques** couvrent l'intégralité des catégories. Ajouter
> un logiciel ou un type d'entité ne crée **aucun** nouveau modèle.

---

## 4. Le mapping par catégorie (toutes les familles → ontologie)

Chaque famille radar produit des entités ontologiques. C'est la table de référence
pour le seed du registre et les mappings pilotes :

| Famille | coreType / subtype produits | Relations typiques |
|---|---|---|
| **accounting** | Transaction(invoice, payment, order, credit_note) · Party(supplier, client) · Document(invoice_pdf) | invoice party_of(billed_to) Party · invoice derived_from order · payment references invoice |
| **crm** | Project(deal) · WorkItem(lead) · Party(prospect, contact, organization) · Communication(activity) | deal party_of(client) · activity mentions deal |
| **productivity** | WorkItem(task, subtask, milestone) · Project(project) · Event(deadline) | subtask child_of task · task part_of project · task assigned_to Party |
| **calendar** | Event(calendar_event, meeting) · Party(attendee) | event party_of(attendee) · event scheduled_for time |
| **communication** | Communication(message) · Party(contact) · Event(meeting) | message mentions entity · message part_of channel |
| **email** | Communication(email) · Document(attachment) · Party(contact) | attachment attached_to email · email mentions Party |
| **storage** | Document(file) · Asset(folder) | file child_of folder |
| **support** | WorkItem(ticket) · Communication(reply) · Party(client) | ticket party_of(client) · reply part_of ticket |
| **hr** | Party(employee) · Event(absence) · Document(contract) | absence party_of(employee) · contract attached_to Party |
| **devops** (NOUVELLE) | Project(repository) · WorkItem(issue, merge_request) · Event(pipeline_run, deployment, commit, release) · Party(author) | MR part_of repo · pipeline references commit · commit party_of(author) |
| **monitoring** | Event(login_event, anomaly) · Asset(server) | login party_of(user) · anomaly references Asset |

→ La famille **devops** est à ajouter dans `radar/families.js` (capacités :
listRepositories, listIssues, listMergeRequests, listPipelines, listCommits…),
et GitLab + GitHub (déjà présents, ~55 templates chacun) la peuplent.

---

## 5. « Ajouter un plugin = le rendre connectable » : le flux générique

Le point central de ta demande. Le même chemin pour TOUT logiciel, zéro code en dur :

```
1. Le manifest du plugin est importé          (importer.js — existe déjà)
2. Bloc `radar` : familles + capacités
      ├─ déclaré dans le manifest (cas connu, rapide)         OU
      └─ INFÉRÉ par le LLM : échantillonne, propose familles+capacités → tu valides
3. Mapping ontologique (raw → coreType/subtype/role + relations)
      ├─ déclaré (RadarMapping global fourni)                  OU
      └─ APPRIS : le LLM lit 5-10 records → produit le RadarMapping → testé → sauvegardé
4. Connecteur créé dans le wizard → Test (échantillon réel) → Baseline
5. Le linker remplit le graphe via les mappings → entités+relations
6. Dès lors : exécution 100% déterministe (mapping sauvegardé), zéro LLM
```

Donc, pour rendre un nouveau logiciel connectable, deux voies, jamais de
développement spécifique :
- **Voie déclarative** (qualité maximale) : on écrit le bloc `radar` + un
  `RadarMapping` (ce que j'ai fait pour Odoo/Dolibarr/Gmail/Nextcloud).
- **Voie apprise** (couverture universelle) : on connecte, le Radar échantillonne,
  le LLM infère bloc + mapping, tu valides une fois, c'est figé. C'est ainsi qu'on
  couvre les 200+ plugins existants et tout futur logiciel — y compris un ERP
  industriel.

**Dolibarr comme banc d'essai** (à la place de SAP) : ERP complet (376 templates :
tiers, factures fournisseurs/clients, commandes, propositions, projets, tâches,
tickets, agenda, stocks…). Il couvre à lui seul accounting + crm + productivity +
support + calendar — idéal pour valider l'ontologie et les mappings de bout en bout
avant d'attaquer un vrai SAP.

---

## 6. Les fichiers : métadonnées libres, contenu permissionné

> « Nextcloud les fichiers il faut aussi regarder ça non ? Les lire, demander si on
> peut lire. »

Oui, et c'est un cas à part qui mérite son propre traitement (volume + vie privée) :

### Deux niveaux d'accès
1. **Métadonnées (toujours)** : `nc_file_list` / `nc_file_search` → nom, chemin,
   taille, type MIME, date de modification, propriétaire. Chaque fichier devient un
   `Document/file`, relié à son dossier (`child_of`). Suffisant pour : détecter les
   dépôts, l'arborescence, les fichiers récents, les contrats par date d'échéance
   (depuis le nom), le « rien déposé en mai » du cas compta.
2. **Contenu (sur autorisation explicite)** : lire le fichier (`nc_file_get`) et en
   extraire le texte (PDF/docx → texte ; images/scan → OCR) → `RadarDocumentContent`.
   C'est ce qui permet de classer « ce PDF est une facture SFR », d'extraire un
   montant, une date d'échéance de contrat, etc.

### Le modèle de permission
- Étendre `RadarConnector.scopeConfig` : `contentAccess: { enabled, folders: [...],
  mimeTypes: [...], maxBytes, ocr: bool }`. Par défaut **désactivé**.
- Le **wizard demande explicitement** (card question / étape de calibrage) : « Le
  radar peut-il lire le contenu des fichiers du dossier /Compta/Fournisseurs pour
  identifier les factures ? » → seul ce périmètre est lu.
- Sans autorisation : métadonnées seulement. Avec : contenu extrait, mais jamais le
  corps complet stocké au-delà du nécessaire (extrait + features), TTL configurable.

### GitLab / code (famille devops)
- Repo = `Project/repository` ; issues/MR = `WorkItem` ; commits/pipelines/releases
  = `Event` ; auteurs = `Party`. On observe les **métadonnées et les textes**
  (titres, descriptions d'issues/MR, messages de commit).
- Le **contenu du code** n'est PAS lu par défaut (échelle + sensibilité) — lecture
  opt-in et scopée, comme les fichiers. Utile surtout pour relier « cette MR
  concerne le déploiement Joly Formations » au projet et aux tickets.

---

## 7. Comment l'observation reste générique (lien avec le CDC)

Le `watch` du manifest (déjà en place) déclare quelles capacités surveiller et
comment hasher. Combiné au mapping, ça donne une chaîne **entièrement générique** :

```
provider (Dolibarr/GitLab/Nextcloud…)
  → capacité de lecture (déclarée ou inférée)
  → RadarMapping (raw → ontologie)          ← le seul point spécifique au logiciel
  → RadarEntity + RadarRelation (graphe)     ← universel
  → RadarFeedback / RadarModel               ← universel (apprentissage)
```

Et la détection de changement suit le plan CDC (cf. RADAR_CERVEAU_ULTRAPLAN §10ter) :
push/webhook > curseur `modified_since` > scan paginé+hash, un flux = un job. Le
mapping s'applique au fil des deltas entrants, pas sur un re-scan global.

---

## 8. Phasage (s'insère dans le plan cerveau)

| Étape | Contenu | Dépend de |
|---|---|---|
| **A0 — Ontologie** | `RadarOntologyType` (registre seedé ~40 sous-types) + vocabulaire de relations | — |
| **A1 — Graphe générique** | `RadarEntity` + `RadarRelation` + linker générique piloté par `RadarMapping` | A0 |
| **A2 — Mappings pilotes déclarés** | `RadarMapping` écrits pour Dolibarr (toutes familles), Nextcloud, Gmail, GitLab | A1 |
| **A3 — Famille devops** | `families.js` + blocs radar GitLab/GitHub | A1 |
| **A4 — Fichiers/contenu** | `scopeConfig.contentAccess`, `RadarDocumentContent`, extraction texte/OCR, permission wizard | A1 |
| **A5 — Mapping appris (LLM)** | inférence LLM du bloc radar + `RadarMapping` pour tout plugin inconnu → couverture universelle | A2 |
| puis | Niveaux 2→5 du plan cerveau (feedback, distillation, forecasting, pertinence) — opèrent sur l'ontologie, donc valables pour toutes les catégories | A1 |

A0→A2 posent la mémoire générique (suivi temps réel des entités/relations sur
Dolibarr + Nextcloud + GitLab). A5 ouvre la connectabilité universelle (n'importe
quel logiciel). Le cerveau (apprentissage/forecasting) se branche ensuite **une
fois pour toutes** sur l'ontologie, pas par logiciel.

---

## 8 bis. Audit de couverture des plugins (197 plugins analysés)

État au 16/06/2026 : **34 plugins équipés** d'un bloc radar, **163 non équipés**.
Mais tous ne sont PAS pertinents pour le Radar — d'où une distinction clé :

### Plugins NON pertinents pour le Radar (à ne PAS équiper)
Ce sont des **outils que l'AGENT utilise**, pas des logiciels métier que le Radar
surveille :
- **IA/LLM & infra IA** (~35) : openai, anthropic, mistral, cohere, perplexity,
  elevenlabs, replicate, firecrawl, apify, browserbase… → tooling de l'agent.
- **Bases de données & infra** (~40) : postgresql, mongodb, redis, snowflake,
  kafka, pinecone, qdrant, aws, docker, jenkins, **sap** (en tant que connecteur
  DB brut)… → ce sont des **sources** potentielles, mais via connecteur DB générique,
  pas une famille métier.

### Familles MÉTIER à AJOUTER (catégories oubliées) + plugins à équiper
| Nouvelle famille | Entités ontologie | Plugins à équiper |
|---|---|---|
| **devops** | Project(repo), WorkItem(issue/MR), Event(pipeline/commit/release) | gitlab, github |
| **marketing** | Communication(campaign), Party(subscriber/lead), Event(send) | mailchimp, brevo, sendgrid, klaviyo, activecampaign, customer_io, mailgun, lemlist, smartlead, instantly, iterable, postmark, resend, beehiiv, substack, convertkit |
| **ecommerce** | Transaction(order), Asset(product), Party(customer) | shopify, woocommerce, prestashop, ebay |
| **payment** | Transaction(payment, payout, charge, transfer, refund, bank_tx), Party(payer) | **Purs (à équiper)** : paypal, adyen, checkout-com, wise, revolut_business, plaid, bill, fireblocks · **Déjà en accounting, à doter AUSSI d'un bloc payment** : stripe (charges/payment_intents), qonto (transactions/virements SEPA), quickbooks/xero (payments) · **Absents (à créer si besoin)** : gocardless, mollie, square, sumup, braintree, klarna |
| **social** | Communication(post, mention), Event(publication) | linkedin, twitter, facebook, instagram |
| **analytics** | Event(metric, anomaly), Asset(property) | matomo, plausible, posthog, mixpanel, amplitude_api, sentry, datadog |
| **telephony** | Communication(call), Event(call_event), Party(caller) | aircall, ringcentral, talkdesk, twilio |
| **meeting** | Event(meeting, recording), Document(transcript) | zoom, loom (+ google-calendar/teams déjà calendar) |
| **esign** | Document(contract, signature_request), Event(signed) | docusign, yousign |
| **forms** | Communication(submission), Party(respondent) | typeform, (airtable=productivity/data) |
| **seo** | Event(ranking, audit), Asset(keyword/site) | ahrefs, semrush, se-ranking, serpapi |
| **crm (extension)** | déjà famille crm | close_crm, attio, apollo, salesloft, outreach |
| **support (extension)** | déjà famille support | crisp, front, helpscout, livechat |

Et compléter les familles existantes (productivity : airtable, miro, figma, footstep ;
communication : telegram, whatsapp, google-chat, microsoft-teams).

### Principe IMPORTANT : un logiciel = PLUSIEURS familles
Un provider n'appartient pas à une seule famille. Le bloc `radar` est déjà un
**tableau** de blocs (Odoo = accounting + crm + support + hr ; Dolibarr = 5
familles). Donc :
- **Stripe** = `accounting` (factures) + `payment` (charges, payouts, virements).
- **Qonto** = `accounting` + `payment` (transactions bancaires, virements SEPA).
- **QuickBooks/Xero** = `accounting` + `payment` (paiements).
- La donnée converge de toute façon vers `Transaction` dans l'ontologie ; les
  familles ne sont que les **portes d'entrée du wizard** (« quel logiciel pour ta
  banque/tes paiements ? »). Aucun risque de doublon en base : une facture est UNE
  `RadarEntity`, peu importe par combien de familles elle est observée (champ
  `sources[]` multi).

### Conséquence sur le plan
- Ajouter ~11 familles dans `radar/families.js` (devops, marketing, ecommerce,
  payment, social, analytics, telephony, meeting, esign, forms, seo, industry).
- Compléter les blocs `radar` des providers multi-familles déjà équipés (ajouter
  `payment` à stripe/qonto/quickbooks/xero, etc.).
- Équiper ~80 plugins métier (voie déclarative pour les pilotes, **voie LLM-apprise**
  pour le volume — c'est exactement à ça que sert le mapping appris §5).
- Les ~75 plugins infra/IA restent hors Radar (ils servent à l'agent, pas à la
  surveillance).
- **Lecture de fichiers** : confirmé que tous les storage ont le téléchargement de
  contenu — Nextcloud `nc_file_get`, Drive `gdrive_download_file`, Dropbox
  `dbx_download_file`, Box `box_file_download`, SharePoint `sharepoint_download_file`.
  Le mapping `Document` doit utiliser ces templates de **download** pour la lecture
  de contenu (pas seulement les `*_get` de métadonnées).

---

## 8 ter. Wizard de settings & reset Radar (admin)

> « Un grand wizard de settings, et en admin dans /settings une page pour supprimer
> toutes les informations du Radar et reset la mémoire, comme reparti à zéro. »

### Reset Radar (factory reset — pour les tests)
- Endpoint admin `POST /workspaces/:wsId/radar/reset` (ou global) qui purge les
  collections radar du workspace : connectors, snapshots, deltas, signals,
  missions, wakeups, cards, chat, knowledge, playbooks, feedback, entities,
  relations, mappings, document-content, models. Avec options (« tout » vs « garder
  les connecteurs/playbooks »).
- Page **/settings → onglet Radar** (admin) : bouton « Réinitialiser le Radar »
  avec confirmation forte (taper le nom du workspace), cases à cocher par type de
  donnée, et compteurs (« 1240 snapshots, 89 signaux, 12 missions… »).
- *Implémenté en priorité* car indispensable pour itérer sur les tests sans
  repartir d'une base polluée.

### Grand wizard de settings (onboarding complet)
- Étend le wizard connecteurs (déjà conçu, phase 5 du plan entreprise) en un
  parcours unique : profil entreprise → familles & logiciels (par catégorie) →
  credentials (OAuth 1-clic / clés) → calibrage (arborescence fichiers, contacts
  clés, périmètres de lecture, permission contenu) → règles d'autonomie & modèles →
  baseline. Réentrant (ajouter un logiciel plus tard).

---

## 8 quater. L'industrie : capteurs, arrêts machine, production (MES / IoT)

> « Beaucoup l'industrie avec les capteurs, arrêt machine, tout ça. On doit tous
> pouvoir mapper, même si SAP il manque beaucoup de nodes pour le moment avec la
> production. »

C'est un domaine à part qui **introduit un nouveau type de donnée** (les
mesures temps-réel) et une nouvelle famille. C'est aussi le cas extrême du
problème d'échelle (un capteur émet des milliers de points/jour).

### Nouvelle famille `industry` (MES / production / maintenance)
Capacités : `listMachines`, `listProductionOrders`, `listDowntimes`,
`listMaintenanceOrders`, `listSensorReadings`, `getOEE`, `listAlarms`,
`listQualityChecks`.

### Nouveaux sous-types ontologiques (réutilisent les coreTypes existants)
| coreType | Sous-types industriels | Champs canoniques |
|---|---|---|
| **Asset** | machine, equipment, sensor, production_line, workstation, tool | name, type, status (running/stopped/maintenance), location, line, criticality |
| **WorkItem** | work_order (ordre de fabrication/OF), maintenance_order, production_task | number, product, quantity, status, dueDate, line, assignee |
| **Event** | machine_stop (arrêt machine), downtime, alarm, breakdown, maintenance, production_run, shift, quality_check | type, asset, start, end, duration, cause, severity |
| **Transaction** | material_movement, stock_movement (consommation matière) | item, quantity, from, to, date |

### Le NOUVEAU coreType : `Measurement` (séries temporelles)
Les capteurs émettent un flux continu (température, vibration, compteur de pièces,
consommation, OEE/TRS…). Ce ne sont **pas** des entités du graphe — ce sont des
**mesures haute fréquence**. Modèle dédié, traité en série temporelle :
```js
RadarMeasurement {
  workspaceId, assetId,        // → RadarEntity (machine/sensor)
  metric,                      // "temperature" | "piece_count" | "oee" | "vibration"
  value, unit, at,
  source: { connectorId, providerKey }
}
```
- **Stockage** : agrégé/downsamplé (moyenne par minute/heure), pas un point brut par
  ligne — sinon des millions de docs. Option base time-series (MongoDB time-series
  collections, ou InfluxDB/Timescale via connecteur, déjà présents dans les plugins).
- **Du flux à l'événement** : on ne crée un `Event` (machine_stop, alarm) que sur un
  **franchissement de seuil** ou une **anomalie détectée** sur le flux. Le capteur
  qui tourne normalement = zéro signal. Une chute de cadence / un arrêt = un Event +
  un RadarSignal. C'est le filtre de significance appliqué au temps-réel industriel.

### Connecteurs industriels (le « SAP manque des nodes »)
- **SAP PP/PM** : modules Production Planning (ordres de fab, nomenclatures, gammes)
  et Plant Maintenance (équipements, ordres de maintenance, pannes). Le plugin SAP
  actuel n'expose pas ces nodes → à enrichir (OData/BAPI des modules PP/PM), puis
  mapping vers l'ontologie ci-dessus.
- **MES / IoT directs** : pour les capteurs, les protocoles standards sont
  **OPC-UA, MQTT, Modbus** (pas des API REST). → nouveaux connecteurs « edge » à
  créer (un agent qui s'abonne aux topics MQTT / nœuds OPC-UA et pousse des
  `RadarMeasurement` + `Event`). C'est l'archétype du **push/CDC** (§7) : on
  s'abonne au flux, on ne scanne jamais.
- **GMAO** (Dolibarr a un module équipements/interventions limité ; vrais outils :
  Mobility Work, Fiix…) → famille `industry`, mapping standard.

### Ce que ça débloque (cas d'usage industriels du Radar)
- « Machine 3 arrêtée depuis 47 min — cause : défaut capteur pression. »
- « OEE ligne A en baisse de 12 % cette semaine » (forecasting sur `RadarMeasurement`).
- « Consommation visserie ×8 ce mois » (déjà fait en compta — même logique sur la matière).
- « Maintenance préventive moteur X due dans 200h de fonctionnement » (compteur capteur).
- Prédiction de panne (le forecasting du plan cerveau, nourri par les séries capteurs).

### Conséquence sur le plan
- Ajouter la famille `industry` + le coreType `Measurement` + le modèle
  `RadarMeasurement` (série temporelle, agrégée).
- Les arrêts/alarmes/maintenances sont des `Event` → entrent dans le graphe, le
  board, les signaux, le forecasting comme tout le reste (l'ontologie reste le
  point de convergence).
- Les connecteurs edge (OPC-UA/MQTT) et SAP PP/PM sont un chantier connecteur
  spécifique, mais une fois les données mappées, le cerveau les traite **sans rien
  de spécifique** — exactement la garantie de généricité.

---

## 8 quinquies. Catalogue sectoriel — tous les domaines, tous les cas d'usage

> Imaginer TOUS les types de données possibles, dans tous les métiers (médecine,
> industrie, expert-comptable…). C'est la **preuve d'universalité** : chaque
> secteur, aussi spécifique soit-il, se projette sur les **mêmes 8 coreTypes +
> Measurement**. Seuls changent le **vocabulaire de sous-types**, les **mappings**
> et les **seuils métier** — tous pilotés par données (`RadarOntologyType`), sans
> aucun nouveau modèle ni code.

Pour chaque domaine : entités → (coreType.subtype), événements/mesures clés, cas d'usage Radar.

### Santé / Médical (cabinet, clinique, labo)
- **Party** : patient (person), praticien (person), établissement/labo (org), mutuelle/CPAM (org)
- **WorkItem** : consultation à planifier, acte médical, dossier de soin
- **Event** : consultation, hospitalisation, intervention, vaccination, examen, RDV
- **Document** : dossier médical, ordonnance, compte-rendu, résultat d'analyse, imagerie, feuille de soin
- **Transaction** : facture de soin, honoraire, remboursement, tiers payant
- **Measurement** : constantes (tension, glycémie, température, FC, SpO₂, poids), résultats bio
- **Asset** : équipement médical, lit, salle, automate
- **Cas** : constante hors seuil → alerte ; vaccination/renouvellement d'ordonnance dû ; RDV manqué à reprogrammer ; résultat d'analyse anormal ; remboursement en attente. *(Sensibilité : données de santé → HDS/RGPD, lecture de contenu strictement permissionnée.)*

### Expert-comptable / Comptabilité
- **Party** : client (entreprise), fournisseur, salarié, administration (URSSAF, DGFiP)
- **Transaction** : facture, paiement, écriture, déclaration TVA, bulletin de paie, note de frais, immobilisation, lettrage
- **Document** : pièce comptable, liasse fiscale, bilan, grand livre, FEC
- **Event** : clôture mensuelle/annuelle, échéance (TVA, IS, CFE, CVAE), AG, dépôt des comptes, paie
- **WorkItem** : saisie, révision, déclaration à produire
- **Measurement** : CA, marge, trésorerie, BFR, ratios
- **Cas** : échéance fiscale qui approche ; facture non rapprochée/non lettrée ; trésorerie prévisionnelle négative ; pièce manquante avant clôture ; paie à valider ; client dont le CA dérive.

### Industrie / Production (MES, IoT) — cf. §8quater
- **Asset** : machine, ligne, capteur, outil, robot · **WorkItem** : OF, ordre de maintenance
- **Event** : arrêt machine, panne, maintenance, changement de série, contrôle qualité
- **Measurement** : OEE/TRS, température, vibration, cadence, énergie, rebut, pression
- **Cas** : arrêt machine prolongé ; OEE en baisse ; maintenance préventive due (heures de fonctionnement) ; rupture matière ; défaut qualité récurrent ; surconsommation énergie.

### Juridique (avocat, notaire, juriste)
- **Party** : client, partie adverse, juridiction, confrère
- **WorkItem** : dossier/affaire, diligence procédurale
- **Event** : audience, délai de prescription, échéance procédurale, signification, RDV, signature d'acte
- **Document** : contrat, acte, conclusions, pièce, jugement
- **Transaction** : honoraire, provision, débours
- **Cas** : délai de procédure/prescription qui approche ; audience à préparer ; acte à signer ; provision épuisée ; pièce manquante au dossier.

### BTP / Construction
- **Party** : client, sous-traitant, fournisseur, maître d'œuvre · **Project** : chantier
- **WorkItem** : lot, tâche, intervention · **Asset** : engin, matériel, échafaudage
- **Event** : réception de travaux, jalon, livraison matériaux, réunion de chantier
- **Document** : devis, situation de travaux, PV de réception, plan, DOE
- **Transaction** : facture, situation, retenue de garantie, avenant
- **Measurement** : avancement %, heures, consommation
- **Cas** : situation de travaux à facturer ; retenue de garantie à libérer ; retard chantier ; dépassement budget ; matériaux non livrés.

### Commerce / Retail / E-commerce
- **Party** : client, fournisseur · **Asset** : produit, stock, point de vente
- **Transaction** : commande, vente, retour, remboursement, réappro
- **Event** : promotion, rupture, livraison · **Measurement** : ventes, panier moyen, taux de conversion, niveau de stock
- **Cas** : rupture de stock imminente ; baisse des ventes ; panier abandonné ; taux de retour anormal ; réappro à déclencher.

### Logistique / Transport
- **Asset** : véhicule, entrepôt, colis, conteneur · **WorkItem** : expédition, tournée, ordre de transport
- **Event** : enlèvement, livraison, retard, incident · **Measurement** : délai, km, taux de service, **température (chaîne du froid)**
- **Cas** : retard de livraison ; rupture de chaîne du froid (capteur) ; taux de service en baisse ; colis perdu/litige.

### Agriculture / Agro
- **Asset** : parcelle, animal, équipement, silo · **Measurement** : météo, humidité sol, rendement, poids/lait animal
- **Event** : semis, récolte, traitement, vêlage, intervention vétérinaire
- **Cas** : alerte météo (gel) ; fenêtre de traitement ; suivi rendement ; santé animale (constante anormale).

### Immobilier / Gestion locative
- **Party** : propriétaire, locataire, agence · **Asset** : bien, lot
- **Transaction** : loyer, charges, caution · **Event** : bail, état des lieux, échéance, visite, révision d'indice
- **Document** : bail, diagnostic, quittance
- **Cas** : loyer impayé ; bail à renouveler ; diagnostic expiré ; régularisation de charges ; échéance de révision.

### Hôtellerie / Restauration
- **Asset** : chambre, table, stock cuisine · **Transaction** : réservation, addition, facture
- **Event** : check-in/out, réservation, no-show · **Measurement** : taux d'occupation, RevPAR, couverts
- **Cas** : no-show/surbooking ; rupture stock cuisine ; avis client négatif ; occupation faible à anticiper.

### Éducation / Formation (OF, écoles)
- **Party** : apprenant, formateur, établissement, OPCO · **WorkItem** : cours, module, devoir
- **Event** : session, examen, absence · **Document** : support, attestation, convention, émargement
- **Measurement** : notes, présence, progression
- **Cas** : absence à signaler ; échéance Qualiopi ; session à remplir ; convention/financement OPCO manquant ; certification due. *(Digiforma déjà dans les plugins.)*

### Assurance / Courtage
- **Party** : assuré, courtier, compagnie · **WorkItem** : sinistre, contrat
- **Event** : échéance, déclaration de sinistre, expertise, renouvellement · **Transaction** : prime, indemnisation
- **Cas** : sinistre à traiter sous délai ; échéance/renouvellement de contrat ; prime impayée ; expertise en attente.

### Services professionnels (conseil, agence, IT)
- **Party** : client · **Project** : mission/projet · **WorkItem** : tâche, livrable
- **Event** : deadline, réunion, jalon · **Transaction** : facture, temps passé · **Measurement** : temps facturable, marge projet
- **Cas** : projet terminé non facturé ; dépassement de temps/budget ; livrable en retard ; client silencieux (devis sans réponse).

### RH (transverse à tous les secteurs)
- **Party** : salarié, candidat · **WorkItem** : recrutement, onboarding/offboarding
- **Event** : congé, absence, entretien, fin de contrat/période d'essai, formation · **Document** : contrat, bulletin, attestation
- **Measurement** : turnover, absentéisme
- **Cas** : fin de période d'essai ; départ salarié (checklist) ; entretien annuel dû ; document RH manquant ; absentéisme anormal.

### La preuve : un seul moteur, N secteurs
Aucune de ces verticales n'introduit un nouveau **coreType** (sauf l'industrie qui
a justifié `Measurement` pour le temps-réel). Tout le reste = **sous-types +
mappings + seuils**, dans le registre. Donc :
- Le **graphe**, le **forecasting**, le **board**, les **missions**, la **pertinence**
  marchent identiquement pour un cabinet médical, une usine ou un expert-comptable.
- Adapter KINN à un nouveau métier = **alimenter le registre** (sous-types + seuils)
  + brancher ses logiciels (mapping déclaré ou appris). Zéro réécriture du cerveau.
- C'est exactement le modèle **ontologie + graphe + modèles + feedback** de
  Palantir, mais **multi-sectoriel par conception** : la verticalisation est de la
  donnée, pas du code.

---

## 9. Pourquoi c'est vraiment générique (la garantie)

- **Aucun modèle Mongo par type métier** : 6 modèles couvrent tout. Un nouveau type
  d'entité = une ligne de registre. Un nouveau logiciel = un `RadarMapping` (écrit
  ou appris). Une nouvelle catégorie = une famille dans `families.js`.
- **Le cœur du Radar ne connaît que l'ontologie** : graphe, feedback, modèles,
  forecasting, pertinence, board, missions — tout raisonne en coreType/subtype/role,
  jamais en format Odoo/SAP/GitLab. On peut donc tout faire évoluer sans toucher aux
  connecteurs, et brancher un connecteur sans toucher au cerveau.
- **La spécificité d'un logiciel est isolée dans UN objet** (`RadarMapping`),
  déclaré ou appris, déterministe à l'exécution, versionné, à dérive détectée.

*Document généré le 16/06/2026 — complète RADAR_CERVEAU_ULTRAPLAN.md (ontologie + connectabilité générique multi-catégories). Ancré sur les plugins réels : Dolibarr (376 tmpl), GitLab/GitHub (~55), Nextcloud (lecture fichiers).*
