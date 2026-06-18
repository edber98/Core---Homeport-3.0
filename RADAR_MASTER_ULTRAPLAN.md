# KINN Radar — ULTRAPLAN MAÎTRE D'EXÉCUTION (unifié avec l'existant)

> **Rôle de ce document.** Les deux docs de vision existent déjà :
> `RADAR_CERVEAU_ULTRAPLAN.md` (le cerveau 5 couches : graphe → feedback →
> modèles → process → pertinence) et `RADAR_ONTOLOGIE_GENERIQUE.md` (l'ontologie
> universelle + connectabilité de TOUS les logiciels). **Ce document est le plan
> d'EXÉCUTION qui les fusionne avec le code réel** : pipeline d'observation déjà
> en place, modèles Mongo, scheduler, significance/superviseur, UI à 6 onglets,
> gating env. Objectif : **rien oublier** (fonctionnalités, modèles IA, liens,
> UI/UX, wizard de config, suivi, optimisation, propositions) et **tout unifier
> avec l'existant** — aucun système parallèle, on étend ce qui tourne déjà.
>
> Principe directeur unique : **on ne reconstruit rien. On branche.** Le graphe,
> les modèles, les nouvelles vues s'insèrent dans le pipeline
> `connecteur → collector → snapshot/delta → significance → superviseur → board`
> qui existe et fonctionne. Chaque phase est livrable seule, testée, et invisible
> si `RADAR_ENABLED` est off.

---

## ★ FEUILLE DE ROUTE ORDONNÉE & ÉTAT (réf. unique — mise à jour 17/06)

> Rien n'est abandonné. Voici l'ordre d'exécution complet, du fait au restant. On
> avance phase par phase, testé à chaque étape. Les lettres A–W et I/J des échanges
> sont toutes reportées ici.

### ✅ FAIT (socle cerveau Étages 1→3 partiels + connectabilité dynamique)
- Graphe (RadarEntity/Relation/Mapping), ontologie + registre, linker branché au scheduler, **graphe connecté** (aliasKeys).
- Watch Dolibarr déclarées ; **connecteurs RÉELS** (Dolibarr, OpenProject, Nextcloud Files) ; remise à zéro (zéro simulation).
- **Mapping appris (LLM)** + **auto-apprentissage** des types inconnus (zéro-hardcode) — SAP/Cegid/Trello/Digiforma OK.
- **Ontologie DYNAMIQUE** : sous-types ouverts créés+enregistrés par le LLM (squelette 9 coreTypes + relations + rôles = fermé).
- **Connecteur BD intelligent** : scan collections → catégorise → brouillon si doute (backend).
- **Process mining** (cycle de vie + **cross-logiciel** object-centric, système affiché à chaque étape).
- **Analyse** : goulots, retards, **anomalies de corrélation** (matching flou), **financier**.
- **I — Recommandations d'action** + **J — Forecasting** + **1er vrai modèle** (régression logistique « risque d'impayé », registre RadarModel).
- UI : onglets Mémoire (Cytoscape), Données & Schémas, Processus, Analyse + contexte entreprise.

### 🏗️ ORDRE DE CONSTRUCTION DÉFINITIF (en 7 strates — chacune s'appuie sur la précédente)

> Vision cible : **Celonis (intelligence de process) + Palantir (ontologie + graphe
> opérationnel + actions) réunis, interconnectés sur TOUS les types de données
> entreprise**. On construit comme un gratte-ciel : fondation → mémoire fiable →
> connectabilité totale → intelligence → ACTION → interface → industrialisation.
> Légende : ✅ fait · ⏳ partiel · ➕ à ajouter (nouveau) · 🔧 à ajuster.

**S0 — Socle d'observation** ✅ (collector/scheduler/significance/superviseur, gating env, registre modèles).

**S1 — MÉMOIRE FIABLE (la « source de vérité » — cœur Palantir).** Sans mémoire juste, tout le reste ment.
- ✅ Graphe connecté (entités/relations, aliasKeys), ontologie **dynamique** (sous-types ouverts), mapping appris/auto.
- ✅ Résolution d'identité : dédup clé forte + **doublons/double-saisie** (R4.2).
- ✅ **Dérive de schéma → ré-inférence** (R3.1).  ➕ **R3.2 ré-entraînement auto périodique** (trainer nocturne).
- ➕ **Gouvernance d'ontologie** : validation/versionnement des sous-types proposés par le LLM (workflow d'approbation), avant activation.
- ⏳ **Lignée/provenance** complète (raw→mapping→entité) — étendre à la traçabilité de bout en bout + qui/quand.

**S2 — CONNECTABILITÉ TOTALE (toutes les données entreprise entrent).**
- ✅ Connecteurs réels (Dolibarr/OpenProject/Nextcloud) + **connecteur BD intelligent** (scan collections, backend).
- ➕ **R1.3 UI flow connecteur BD** (choisir base→scanner schéma→confirmer) + **connecteur custom** (décrire+plugin→auto-analyse) + **R1.2 confirmation des mappings brouillon**.
- ➕ **R2.1 scoping dossier racine** (Nextcloud/Drive/SharePoint/Dropbox) + **R2.2 CDC** (webhooks/curseurs/delta — fin du full-scan, prérequis échelle).
- ➕ **R2.3 base Mongo SAP-like réelle** (OF/statut/capteurs) + **Home Assistant → Measurement** ; **R2.4 +familles** (devops, payment, marketing, ecommerce, industry…) + Digiforma.

**S3 — INTELLIGENCE (comprendre & anticiper — cœur Celonis).**
- ✅ Process mining (cycle de vie + **cross-logiciel** object-centric) ; analyse (goulots/retards/anomalies/financier) ; modèles (logreg risque, **kNN**), forecasting capteur.
- ➕ **Conformance & root-cause** : écart au processus attendu, *pourquoi* un goulot (corrélation attributs/modèles), variantes déviantes.
- ➕ **R4.4 distiller les tâches** (significance kNN branché sur RadarFeedback réel, classif fournisseur, **pertinence apprise** — Étage 6).
- ➕ **R5.2 modèles LOURDS** (ARIMA/réseaux de neurones/PM4Py via **sandbox Python**) : prédiction de panne, OEE, trésorerie avancée.

**S4 — ACTION (opérer, pas seulement observer — différenciateur Palantir/Celonis).**
- ⏳ Recommandations d'action ✅ + doublons/capteurs intégrés. ➕ **R4.1 exécution write-back** : agir DANS les systèmes via les capacités `write` des plugins (relancer une facture, corriger/synchroniser un doublon, mettre à jour un statut) — avec validation/autonomie (playbooks existants).
- ➕ **Synchro auto inter-systèmes** (corrige double-saisie/écarts détectés).
- ➕ **R4.3 échéances & SLA** (TVA, contrats, délais) → alertes **anticipées** + actions.
- ➕ **Simulation / what-if** : impact prévu d'une action/changement avant de la faire.

**S5 — INTERFACE & DIALOGUE (piloter le cerveau).**
- ➕ **R1.1 refonte UI radar + grand wizard de settings + vue roadmap/tâches** (voir fait/à venir).
- ➕ **R1.4 flux cross-logiciel VISUEL** (DFG nœuds/échelons) + **R6.4 timeline d'un cas**.
- ➕ **R6.1 IA conversationnelle sur le graphe** (questions en langage naturel — type Palantir AIP) + **R4.5 UI supervision apprentissage** (% décisions sans LLM, maturité modèles).
- ➕ **R6.2 agent web-research** pour le contexte entreprise (nom+site→en ligne→suggère modules).

**S6 — INDUSTRIALISATION (échelle, sécurité, ops).**
- ➕ **Échelle/CDC** à des millions de lignes (jobs par flux, watermarks, backpressure) — prérequis SAP/gros volumes.
- ➕ **R6.3 lecture de contenu fichiers** permissionnée (PDF/OCR → classer factures) ; **R6.5 audit / RGPD / permissions** ; observabilité du radar (santé connecteurs, registre modèles, dérive).

**Chemin critique conseillé** : finir **S1** (mémoire fiable + gouvernance) → **S2 (R1.3/R1.2 UI connecteurs + BD)** pour brancher tout → **S4 (R4.1 actions write-back)** car c'est ce qui transforme « il comprend » en « il fait » (la vraie valeur) → **S3 (conformance/root-cause + modèles lourds)** → **S5 (UI/IA conversationnelle)** → **S6 (scale/sécurité)**. Les pièces déjà faites de S3 tournent en parallèle.

### 📑 INVENTAIRE EXHAUSTIF (tout ce qui a été demandé + manques identifiés — rien d'oublié)

> Statut : ✅ fait · ⏳ partiel · ➕ à faire. Strate cible entre [ ].

**Données & connectabilité**
- ✅ Tester/seeder Dolibarr (tiers, factures, devis, commandes, projets, tâches, tickets, BOM/MO).
- ✅ Connecteurs RÉELS (Dolibarr, OpenProject, Nextcloud Files) ; ✅ remise à zéro / zéro simulation.
- ✅ Watch specs déclarées + ⏳ détail des **articles/lignes** de facture (champ `lines` capté ; ➕ fetch par-entité pour le détail complet) [S2].
- ✅ Mapping **appris** (LLM) + **auto-apprentissage** des types inconnus (Trello/Cegid/SAP/Digiforma).
- ✅ **Connecteur BD intelligent** (scan collections/schéma → catégorise → brouillon si doute) ; ➕ UI du flow [S2] ; ➕ **connecteur custom** (décrire + plugin) [S2].
- ➕ **Scoping dossier racine** (Nextcloud/Drive/SharePoint/Dropbox) [S2] ; ➕ **CDC** (delta/webhooks) [S2/S6].
- ➕ **Base Mongo SAP-like réelle** (OF/statut/capteurs) + **Home Assistant** capteurs réels [S2] ; ➕ **+familles** (devops/payment/marketing/ecommerce…) [S2].
- ➕ **Data quality** (complétude/fraîcheur par connecteur), ➕ **backfill historique**, ➕ **ingestion webhooks** [S6].

**Mémoire (graphe & ontologie)**
- ✅ Graphe connecté, ontologie **dynamique** (sous-types ouverts), registre, lignée ⏳.
- ✅ Résolution d'identité (dédup forte + **doublons/double-saisie**) ; ➕ **UI de fusion/confirmation** des doublons [S5].
- ✅ Corrélation cross-logiciel par nom (+ chemin) + **matching flou** ; ➕ **arbitrage LLM** zone ambiguë (ITBS/IT-BS) [S1].
- ✅ **Dérive de schéma → ré-inférence** ; ➕ **gouvernance d'ontologie** (approbation des types LLM) [S1] ; ➕ **ré-entraînement auto** [S1].

**Intelligence (Celonis)**
- ✅ **Process mining** (cycle de vie + **cross-logiciel**, logiciel affiché à chaque étape, email inclus).
- ✅ Analyse : **goulots, retards, anomalies, financier** (avec origine/détail/raison).
- ➕ **Conformance** (déviations vs process attendu) + **root-cause** + variantes déviantes [S3].
- ✅ Modèles : **régression logistique** (risque impayé, entraîné) + **k-NN** ; ➕ brancher kNN sur **RadarFeedback** réel ; ➕ **pertinence apprise** (Étage 6) ; ➕ **classif fournisseur** [S3].
- ✅ **Forecasting capteur** (tendance/anomalie/projection) + financier ; ➕ **modèles LOURDS** (ARIMA/NN/PM4Py via **sandbox Python**) [S3].
- ➕ **% décisions sans LLM** (indicateur de maturité) + ➕ **registre modèles ops** (rollback/shadow/A-B) [S3/S5].

**Action (Palantir opérationnel)**
- ✅ **Recommandations d'action** (relancer, rattacher, fusionner, vérifier capteur).
- ➕ **R4.1 exécution write-back** dans les systèmes (capacités `write` des plugins) + **synchro auto** inter-systèmes [S4].
- ➕ **Échéances & SLA** (TVA/contrats/délais) → alertes anticipées [S4] ; ➕ **seuil capteur → Event/Signal** auto [S4].
- ➕ **Simulation / what-if** [S4] ; ➕ **notifications** (email/Slack/push) des recos [S4] ; ➕ **digest/briefing** périodique [S4].
- ✅ Playbooks/autonomie (existant) — ➕ brancher sur les recos [S4].

**Interface & pilotage**
- ✅ Onglets Mémoire (Cytoscape), Données & Schémas, Processus (+ cross-logiciel), Analyse (+ recos), contexte entreprise.
- ➕ **Refonte UI + grand wizard de settings + vue roadmap/tâches** [S5] ; ➕ **DFG cross-logiciel visuel** [S5] ; ➕ **timeline d'un cas** [S5].
- ➕ **IA conversationnelle sur le graphe** [S5] ; ➕ **agent web-research** contexte [S5] ; ➕ **UI confirmation mappings brouillon** [S2/S5] ; ➕ **UI supervision apprentissage** [S5].
- ➕ **KPI/dashboards sectoriels** (pilotés par le contexte) [S5] ; ➕ **catégories custom** [S5].

**Industrialisation**
- ➕ **Échelle/CDC** (millions de lignes, jobs par flux) [S6] ; ➕ **lecture contenu fichiers** permissionnée (PDF/OCR) [S6] ; ➕ **audit/RGPD/permissions** [S6] ; ➕ **observabilité du radar** (santé/coût/dérive) [S6] ; ➕ **multi-devise/multi-langue** [S6].
- ✅ Gating `RADAR_ENABLED` + sous-flags ; tout invisible si off.

---

## 0. Ancrage : l'existant EXACT (ce sur quoi on construit)

Cartographié dans le code le 16/06/2026. C'est notre socle, pas une page blanche.

### Backend — pipeline d'observation (déjà fonctionnel)
| Brique | Fichier | Ce qu'elle fait |
|---|---|---|
| Collecteur | `API/src/radar/collector.js` | `collectConnector()` : lit watch specs → `execCapability` (handler plugin + credentials) → `extractItems`/`normalizeEntity` → diff par `contentHash` → `RadarSnapshot` + `RadarDelta`. Baseline 1er passage (0 delta), deltas ensuite. **Déterministe, zéro LLM.** |
| Familles | `API/src/radar/families.js` | 10 familles (storage, email, accounting, crm, productivity, calendar, communication, support, hr, monitoring) avec capacités read/write + `validateRadarBlocks`. |
| Scheduler | `API/src/radar/scheduler.js` | `setInterval` 30 s, opt-in `RADAR_SCHEDULER_ENABLED=1`, claim atomique `lockedUntil`, intervalle par famille × backoff, quiet hours + full sync nocturne, lance significance/superviseur. |
| Significance | `API/src/radar/significance.js` | Tri des deltas : règles (étage 1) + LLM (étage 2) → `RadarSignal`. |
| Superviseur | `API/src/radar/supervisor.js` | Signaux → `RadarMission` (auto-prompting, opt-in `RADAR_SUPERVISOR_ENABLED=1`). |
| Missions | `API/src/radar/missions.js` | Exécution des missions (runHarness), `RADAR_MISSION_MODEL`. |
| Réconciliations | `API/src/radar/reconciliations.js` | z-score achats anormaux, dérive CA, tréso. **Déjà du ML-lite déterministe sans LLM.** |
| LLM radar | `API/src/radar/llm.js` | `llmCompleteJSON`, défaut `claude-haiku-4-5`, `RADAR_LLM_MODEL`. |

### Backend — le graphe (Étage 1, DÉJÀ CONSTRUIT & TESTÉ — 16/06)
| Brique | Fichier | État |
|---|---|---|
| Ontologie | `API/src/radar/graph/ontology.js` | 8 coreTypes + sous-types + 13 relations + rôles + validateurs. ✅ |
| Application mapping (pur) | `API/src/radar/graph/mapping.js` | `applyMapping`, `buildCanonicalKey`, `schemaChecksum`. ✅ |
| Linker | `API/src/radar/graph/linker.js` | `linkConnector(connector)` : snapshots → entités+relations, dédup, idempotent. ✅ **MAIS jamais appelé par le scheduler.** |
| Mapping appris LLM | `API/src/radar/graph/learn-mapping.js` | `inferMapping()` : échantillons → RadarMapping validé. ✅ |
| Requêtes graphe | `API/src/radar/graph/query.js` | `neighborhood`, `graphSummary`, `listEntities`. ✅ |
| Mappings Dolibarr | `API/src/radar/graph/mappings-dolibarr.js` | 9 mappings déclarés + seed. ✅ |
| Tests | `API/src/radar/__tests__/graph-{unit,db,llm}.test.js` | 20 tests (9+8+3), tous verts, dont LLM réel. ✅ |

### Modèles Mongo radar (existants)
`RadarConnector` (family, providerKey, credentialId, pollingPolicy, scopeConfig, capabilityOverrides, health, watermarks) · `RadarSnapshot` (état par entité + contentHash) · `RadarDelta` (created/updated/deleted, changedFields, classification) · `RadarSignal` · `RadarMission` · `RadarCard` · `RadarKnowledge` · `RadarPlaybook` · `RadarChatMessage` · `RadarWakeup` · **`RadarEntity` · `RadarRelation` · `RadarMapping`** (graphe, créés).

### Routes & UI (existantes)
- Routes : `API/src/modules/db/radar.js` — `radarEnabled()`, `GET /radar/config` public, middleware 404 si off (L148), CRUD connectors/board/cards/activity/agenda/knowledge/playbooks/reset.
- UI : `Homeport/src/app/features/radar/radar-page.component.ts` = `nz-tabset` 6 onglets (dashboard, activité, agenda, connecteurs, savoir, procédures) + chat drawer. Services `radar-backend.service.ts`, `radar-config.service.ts`, `radar-events.service.ts` (SSE).
- Gating front : `radarGuard` (`route-guards.ts`) + condition `(!it.radar || radarEnabled)` dans `layout-main`.
- Graphe dispo : `ngx-vflow` (déjà utilisé dans `features/flow/flow-viewer.component.ts`).

### Le GAP central (ce que cet ultraplan comble)
1. **La chaîne `collecte → graphe` n'est pas branchée** : le linker existe mais le scheduler ne l'appelle pas. Le graphe reste vide en prod.
2. **Quasi aucun connecteur n'a de `watch` specs** (Dolibarr = 0). Sans watch, pas d'observation continue → pas de snapshots → rien à linker. Il faut rendre TOUS les connecteurs observables (déclaré OU appris).
3. **Pas d'UI de traçabilité** : on ne peut pas visualiser le graphe, les données brutes, les schémas, le mapping raw→ontologie, ni la maturité d'apprentissage.
4. **Aucun des étages 2→5 du cerveau** (feedback centralisé, kNN, risk, relevance, process) n'existe encore.

---

## 1. Architecture cible unifiée (un seul schéma)

Tout passe par le pipeline existant. Les briques **[NEW]** s'insèrent sans rien casser.

```
 Provider (Dolibarr, GitLab, Nextcloud, Gmail, … 200+ plugins)
   │   manifest.radar : familles + capacités + watch   ← [NEW] watch génériques (déclarées ou APPRISES par LLM)
   ▼
 collector.js  ──►  RadarSnapshot (état) + RadarDelta (changements)      ◄── EXISTE
   │
   ├─► significance.js ──► RadarSignal                                    ◄── EXISTE (deviendra graph-aware)
   │
   └─► linker.js [BRANCHER] ──► RadarEntity + RadarRelation (LE GRAPHE)   ◄── [NEW câblage] (modules déjà écrits)
          │                         via RadarMapping (déclaré ou APPRIS)
          ▼
   query.js : neighborhood / summary / listEntities                       ◄── EXISTE (à exposer en API+UI)
          │
          ├─► feedback.js [NEW] ──► RadarFeedback (dataset étiqueté)       ◄── étage 2
          │        ▲ (chaque action user : validate/dismiss/modify/answer)
          │        │
          ├─► learning/ [NEW] : embeddings + kNN + predict-or-ask         ◄── étage 3 (distillation)
          │        └─► RadarModel (registre, métriques, seuils, rollback)
          │
          ├─► process/ [NEW] : miner directly-follows + RadarRiskModel     ◄── étage 4 (prédictif)
          │
          └─► relevance.js [NEW] : RadarRelevanceModel                     ◄── étage 5 (pertinence apprise)
                   │ (boucle avec significance.js)
                   ▼
   superviseur ──► RadarMission ──► RadarCard (board) ──► UI               ◄── EXISTE (lit le graphe + modèles)
```

**Garantie d'unification** : le superviseur, la significance, les missions, le board **ne voient que l'ontologie** (coreType/subtype/role) — jamais le format brut d'un logiciel. La spécificité par logiciel est isolée dans `RadarMapping` (déclaré ou appris). Brancher un connecteur ne touche pas le cerveau ; faire évoluer le cerveau ne touche pas les connecteurs.

---

## 2. Les modèles de données (récap complet — rien oublié)

| Modèle | État | Rôle |
|---|---|---|
| `RadarConnector` | existe | source observée (+ `scopeConfig.contentAccess` [NEW] pour fichiers, `watchOverrides` [NEW]) |
| `RadarSnapshot` / `RadarDelta` | existent | observation brute (état + changements) |
| `RadarEntity` / `RadarRelation` | créés | le graphe (nœuds + arêtes, dédupliqués cross-connecteurs) |
| `RadarMapping` | créé | adaptateur raw→ontologie (déclaré ou appris LLM), versionné, dérive par checksum |
| `RadarOntologyType` | **[NEW]** | registre des sous-types (données, pas code) — seed ~40 sous-types, extensible à chaud |
| `RadarFeedback` | **[NEW]** | dataset des actions humaines (validate/modify/dismiss/answer + features) |
| `RadarModel` | **[NEW]** | registre des modèles (kNN, risk, relevance) : type, version, métriques, seuils, état actif/rollback |
| `RadarDocumentContent` | **[NEW]** | contenu de fichier extrait (permissionné, TTL) — séparé des métadonnées |
| `RadarMeasurement` | **[NEW, phase industrie]** | séries temporelles capteurs (agrégées) — seul cas time-series |
| `RadarSignal/Mission/Card/Knowledge/Playbook/Chat/Wakeup` | existent | propositions & mémoire (deviennent graph-aware) |

> **6 modèles génériques** (Entity, Relation, Mapping, OntologyType, Feedback, Model) couvrent TOUTES les catégories métier. Ajouter un logiciel = un `RadarMapping`. Ajouter un type d'entité = une ligne de registre. Aucun modèle par métier.

---

## 3. Pipeline d'observation GÉNÉRIQUE — rendre TOUS les connecteurs observables

Le cœur de la demande « il faut que ça fonctionne pour tous les systèmes connecteurs ».

### 3.1 Le format `watch` (existe déjà dans `collector.js`/`families.js`)
```jsonc
"watch": [
  { "entity": "customer_invoice",   // type brut
    "via": "listCustomerInvoices",  // capacité de lecture (déjà mappée à un template)
    "key": "id",                    // clé d'entité
    "hashFields": ["ref","total_ttc","statut","paye"], // champs qui déclenchent un delta
    "itemsField": null,             // où est le tableau dans la réponse (auto sinon)
    "excludeWhen": null,            // filtre d'exclusion
    "detectDeletions": false }      // suppressions (si liste exhaustive)
]
```

### 3.2 Deux voies pour équiper un connecteur (jamais de code par logiciel)
- **Voie déclarative** (pilotes, qualité max) : on écrit le bloc `watch` + un `RadarMapping`. À faire en priorité pour **Dolibarr** (banc d'essai SAP), Nextcloud, Gmail, GitLab.
- **Voie apprise** (couverture des 200+ plugins) : `learn-mapping.js` existe déjà pour le mapping ; on ajoute **`learn-watch.js` [NEW]** : le LLM échantillonne une capacité `list*`, propose `key` + `hashFields` + `entity`, on valide une fois → figé. Couvre tout logiciel inconnu, y compris ERP industriel.

### 3.3 Brancher le linker au scheduler (LE câblage manquant — priorité 1)
Dans `scheduler.js`, après `collectConnector()` réussi et la passe significance :
```
collectConnector → (deltas écrits) → linkConnector(connector) [NEW appel]
                                       → entités/relations à jour
```
Idempotent, déjà testé (`graph-db.test.js`). Gardé par un flag `RADAR_GRAPH_ENABLED` (défaut on si RADAR_ENABLED). Option : ne linker que les snapshots touchés par les deltas du cycle (incrémental) plutôt que tout re-scanner.

### 3.4 Scalabilité (CDC — optimisation, plan cerveau §10ter)
Ordre de préférence, **déjà amorcé** par les watermarks du scheduler :
1. **Push/webhook** (Stripe, HubSpot…) → zéro scan.
2. **Pull incrémental par curseur** (`modified_since`, sync tokens) → high-water mark par `(connecteur, entité)`. **Plus gros levier.**
3. **Scan paginé + hash** (dernier recours) → `contentHash` indexé, batch borné.
Un flux = un job (file bee-queue/Redis déjà présente). Chantier d'industrialisation à part, prérequis avant SAP/volumes industriels ; l'échelle PME actuelle tient avec l'existant.

---

## 4. Les IA / modèles (les 5 couches du cerveau — récap exécutable)

Tout opère **sur l'ontologie** → valable pour toutes les catégories d'emblée.

| Couche | Module [NEW] | Modèle | Ce que ça remplace | Cadence |
|---|---|---|---|---|
| 1 Mémoire | `graph/*` (fait) + câblage | Entity/Relation | re-fetch providers à chaque mission | temps réel (post-collecte) |
| 2 Feedback | `feedback.js` | RadarFeedback | rien (on accumule le carburant) | à chaque action user |
| 3 Distillation | `learning/{embeddings,knn-classifier,predict-or-ask,trainer}.js` | RadarModel | significance LLM, classif fournisseur/client, tickets, résolution d'identité | kNN immédiat ; tabulaire nocturne |
| 4 Process | `process/{miner,risk}.js` | RadarProcess, RadarRiskModel | signaux réactifs → **prédictifs** (« retard 82 % ») | nocturne/hebdo |
| 5 Pertinence | `relevance.js` | RadarRelevanceModel | tri statique → appris (dismiss×4 → rétrograde) | boucle avec significance |

**Le routeur clé** : `predict-or-ask.js`. Pour chaque tâche classifiable → modèle local si `confidence ≥ seuil` (zéro LLM), sinon LLM en arbitre, sinon LLM complet ; l'action humaine devient toujours un nouvel exemple. Garde-fous : un modèle ne « prend la main » que si précision mesurée ≥ 95 % sur set de validation ; dérive → rollback auto vers LLM. **Indicateur unique de maturité : « % de décisions sans LLM à précision ≥ 95 % », par tâche et workspace** (affiché dans l'UI).

Mapping appris (`learn-mapping.js`, fait) = la même distillation appliquée à la transformation des données : LLM = professeur une fois, exécution déterministe à vie.

---

## 5. UI/UX — visualiser & TOUT tracer (la demande explicite)

> « une UI pour tout visualiser : les liens, un graphe, les datas, l'activité, les
> schémas — je dois pouvoir tout tracer. »

On **étend** `radar-page.component.ts` (le `nz-tabset` existant), on n'ouvre pas une UI parallèle. Onglets actuels : Dashboard · Activité · Agenda · Connecteurs · Savoir · Procédures. On ajoute :

### Onglet **Mémoire / Graphe** [NEW] — `radar-graph.component.ts`
- **Graphe interactif** via `ngx-vflow` (réutilisé de `flow-viewer`). Nœuds = `RadarEntity` (couleur par coreType, icône par subtype, badges de rôles), arêtes = `RadarRelation` (label = type/role). Clic nœud → panneau latéral : attributs canoniques, `sources[]` (d'où vient l'entité), voisinage (`query.neighborhood`).
- **Recherche & filtres** : par coreType, subtype, rôle, connecteur, texte (label/canonicalKey).
- **Résumé** : compteurs `graphSummary` (entités par type, relations, sources).
- API : `GET …/radar/graph/summary`, `…/graph/entities`, `…/graph/entities/:key/neighborhood` [NEW].

### Onglet **Données & Schémas** [NEW] — `radar-data.component.ts`
La traçabilité brute → ontologie, en 3 vues :
- **Snapshots** (`nz-table`) : par connecteur/entityType, donnée brute (JSON viewer), `contentHash`, dates. C'est « les datas ».
- **Schémas** : pour chaque `(provider, rawEntityType)`, le `RadarMapping` actif — champs sources → champs canoniques (`fieldMap`), `valueMap`, `relationRules`, `roleRules`, `learnedBy` (manuel/LLM), version, statut, dérive (`checksum`). **C'est la traçabilité du mapping** : on voit exactement comment un champ Dolibarr devient un champ d'ontologie.
- **Lignée (lineage)** : pour une entité, remonter snapshot brut → mapping appliqué → entité+relations produites. « Tout tracer » au sens fort.
- API : `GET …/radar/snapshots`, `…/radar/mappings`, `…/radar/entities/:key/lineage` [NEW].

### Onglet **Apprentissage / Maturité** [NEW] — `radar-learning.component.ts`
- **Registre des modèles** (`RadarModel`) : type, version, précision, seuils, actif/rollback, nb d'exemples.
- **L'indicateur** : « % décisions sans LLM ≥ 95 % » par tâche, courbe dans le temps.
- **Dataset feedback** : volume par taskType, derniers exemples étiquetés.
- API : `GET …/radar/models`, `…/radar/learning/stats` [NEW].

### Enrichissements des onglets existants
- **Activité** : ajouter une ligne temps réel « linker : N entités / M relations mises à jour » + part de décisions auto.
- **Connecteurs** : par connecteur, état d'observation (watch specs actives, dernier delta, dérive de schéma), bouton « apprendre le mapping » (LLM) si absent.
- **Dashboard/Board** : les cards citent désormais le **contexte graphe** (« Client X — 3 factures, 1 ticket ouvert ») au lieu de re-fetcher.

### Patterns imposés (unification)
Standalone components, imports NgZorro explicites, `radar-backend.service.ts` étendu (pas de nouveau service HTTP), SSE via `radar-events.service.ts`, accents FR + capitalisation (cf. CLAUDE.md). Tout sous `RADAR_ENABLED` (les onglets n'apparaissent pas si off, via le guard existant).

---

## 6. Le grand wizard de configuration [NEW]

> « un grand wizard de settings » + permission de lecture de contenu + reset.

`radar-setup-wizard.component.ts`, parcours réentrant :
1. **Profil entreprise** (secteur → pré-charge les sous-types/seuils du registre).
2. **Familles & logiciels** (par catégorie : compta, CRM, fichiers, code, paiement, industrie…). Un logiciel = plusieurs familles.
3. **Credentials** (OAuth 1-clic / clés — réutilise le système Credential existant).
4. **Calibrage** : périmètres (mailboxes, dossiers), contacts clés, **permission de lecture de contenu** des fichiers (`scopeConfig.contentAccess` : enabled, folders, mimeTypes, maxBytes, ocr — désactivé par défaut, demande explicite par dossier).
5. **Observation** : pour un logiciel sans `watch`, proposer l'**apprentissage du mapping/watch** (LLM échantillonne → tu valides).
6. **Autonomie & modèles** : niveau (prudent/équilibré/autonome), seuils de distillation.
7. **Baseline** : 1er passage (0 delta) + construction initiale du graphe.

**Reset Radar (admin)** — déjà partiellement là (`radar-reset.component.ts` + `POST …/radar/reset`) : étendre la purge aux nouvelles collections (entities, relations, mappings, feedback, models, document-content, measurements) avec compteurs et confirmation forte (taper le nom du workspace). Indispensable pour itérer sur les tests.

---

## 7. Suivi, traçabilité, observabilité (le « suivi »)

- **Lignée complète** : raw snapshot → mapping (version) → entité/relations (onglet Données & Schémas).
- **Activité temps réel** : collecte, deltas, linker, signaux, missions, décisions auto vs LLM (SSE existant).
- **Santé connecteurs** : `health` (erreurs consécutives, rate limit, dérive de schéma par checksum).
- **Maturité du cerveau** : « % sans LLM » + précision par modèle + alertes de dérive.
- **Coût** : compteur d'appels LLM évités (kNN/mapping déterministe) — le ROI rendu visible.

---

## 8. Optimisation (le « optimisation »)

- **CDC** (§3.4) : push > curseur > scan-hashé. Jamais de full-scan à l'échelle.
- **Distillation** : kNN + mapping appris → la part LLM baisse dans le temps (mesurée).
- **Linker incrémental** : ne re-linker que les entités touchées par les deltas du cycle.
- **Cache** : embeddings par `contentHash` (un item vectorisé une seule fois) ; graphe lu au lieu de re-fetch providers (le cas ITBS : 30+ appels → 1 lecture de sous-graphe).
- **Jobs par flux** : un `(connecteur, entité)` = un job indépendant, backpressure sur rate limits.

---

## 9. Propositions (le « propositions »)

Le superviseur produit des `RadarCard` (board), désormais nourries par graphe + modèles :
- **Réactives** (existent) : alerte, action proposée, question, briefing, digest.
- **Prédictives** [NEW, étage 4] : « commande 123 : risque de retard 82 % » (RadarRiskModel).
- **Pertinence apprise** [NEW, étage 5] : rétrograder ce qui est ignoré 4×, promouvoir ce qui est ouvert — explicable et réversible.
- **Autonomie** : prudent/équilibré/autonome (prompt-driven, module autonomie existant), playbooks (`auto_with_report`/`full_auto`).
Chaque proposition **cite sa preuve** (voisin validé, feature dominante, sous-graphe) — jamais de boîte noire.

---

## 10. Gating env — tout invisible si désactivé (exigence ferme)

On réutilise le mécanisme existant, on ajoute des sous-flags :
| Flag | Défaut | Effet |
|---|---|---|
| `RADAR_ENABLED` | off (prod) | maître : routes 404 si off (`radar.js` L148), `GET /radar/config` public, `radarGuard` + menu cachent l'UI. **Tout le nouveau passe par là.** |
| `RADAR_SCHEDULER_ENABLED` | off | lance le scheduler (collecte). |
| `RADAR_GRAPH_ENABLED` [NEW] | on si RADAR | branche le linker post-collecte. |
| `RADAR_LEARNING_ENABLED` [NEW] | off | active feedback + kNN + predict-or-ask (étages 2-3). |
| `RADAR_SIGNIFICANCE_ENABLED` / `RADAR_SUPERVISOR_ENABLED` | on / off | existent. |
Les nouveaux onglets UI (Graphe, Données, Apprentissage) sont sous le même `radarGuard` → **n'apparaissent pas du tout si `RADAR_ENABLED` est off**. Aucune fuite visuelle.

---

## 11. Phasage exécutable (unifié, incrémental, testé)

Chaque phase : livrable seule, branchée sur l'existant, avec tests, sans big-bang.

| Phase | Contenu | Fichiers (réels) | Tests | Flag |
|---|---|---|---|---|
| **P0 — Registre ontologie** | `RadarOntologyType` (modèle + seed ~40 sous-types depuis `ontology.js`) + API lecture | `db/models/radar-ontology-type.model.js` [NEW], `radar/graph/ontology-seed.js` [NEW] | unit : seed cohérent avec `ontology.js` | RADAR |
| **P1 — Brancher le graphe** ⭐ | appeler `linkConnector` dans `scheduler.js` post-collecte (incrémental) + API `graph/summary,entities,neighborhood,lineage` | `radar/scheduler.js`, `modules/db/radar.js`, `radar/graph/query.js` | db : collecte Dolibarr réelle → graphe peuplé | `RADAR_GRAPH_ENABLED` |
| **P2 — Watch Dolibarr déclarées** | bloc `watch` dans `plugins/repos/dolibarr/manifest.json` (factures, devis, commandes, projets, tâches, tickets) ; mappings déjà faits | `dolibarr/manifest.json` | collecte→snapshots→deltas→graphe bout en bout | RADAR |
| **P3 — UI Graphe** | onglet Mémoire (`ngx-vflow`) + recherche/filtres + panneau entité | `features/radar/radar-graph.component.ts` [NEW], `radar-page.component.ts`, `radar-backend.service.ts` | e2e manuel + build | RADAR (guard) |
| **P4 — UI Données & Schémas** | snapshots + mappings + lignée (traçabilité raw→ontologie) | `features/radar/radar-data.component.ts` [NEW] | build | RADAR |
| **P5 — Watch/mapping appris** | `learn-watch.js` (LLM infère watch) + bouton « apprendre » dans Connecteurs + wizard étape 5 | `radar/graph/learn-watch.js` [NEW], UI connecteurs | LLM réel : un plugin sans watch → watch valide | RADAR |
| **P6 — Feedback** | `RadarFeedback` + `feedback.js` émetteur, rétro-branché sur cards/signaux/requalify | `db/models/radar-feedback.model.js` [NEW], `radar/feedback.js` [NEW], `modules/db/radar.js` | unit + db : chaque action → 1 feedback | `RADAR_LEARNING_ENABLED` |
| **P7 — Distillation significance** | `learning/{embeddings,knn,predict-or-ask}.js` + `RadarModel`, appliqué à la significance | `radar/learning/*` [NEW], `radar/significance.js` | kNN : après N exemples, tranche sans LLM ; précision mesurée | `RADAR_LEARNING_ENABLED` |
| **P8 — UI Apprentissage/Maturité** | registre modèles + « % sans LLM » + dataset | `features/radar/radar-learning.component.ts` [NEW] | build | RADAR |
| **P9 — Grand wizard** | parcours complet + content permission + reset étendu | `features/radar/radar-setup-wizard.component.ts` [NEW], `radar-reset.component.ts` | build + reset purge nouvelles collections | RADAR |
| **P10 — Process & prédiction** | miner directly-follows + `RadarRiskModel` + cards prédictives | `radar/process/*` [NEW] | unit miner sur traces de deltas | `RADAR_LEARNING_ENABLED` |
| **P11 — Pertinence** | `RadarRelevanceModel` + boucle significance | `radar/relevance.js` [NEW] | unit | `RADAR_LEARNING_ENABLED` |
| **P12 — Fichiers/contenu** | `RadarDocumentContent` + extraction texte/OCR + permission wizard (Nextcloud/Drive/Dropbox download) | `db/models/radar-document-content.model.js` [NEW], `radar/content/*` [NEW] | db + permission off par défaut | RADAR |
| **P13 — Familles & connectabilité** | +11 familles (devops, payment, marketing, ecommerce, social, analytics, telephony, meeting, esign, forms, seo) dans `families.js` + équiper GitLab/GitHub/Stripe/Qonto | `radar/families.js`, manifests | validation blocs radar | RADAR |
| **P14 — Industrie/Measurement** | famille `industry` + coreType `Measurement` + `RadarMeasurement` (time-series, seuils→Event) | `db/models/radar-measurement.model.js` [NEW], `radar/families.js`, ontologie | unit seuils→Event | RADAR |
| **P15 — CDC/scale** | push/webhook > curseur > scan-hashé, jobs par flux (prérequis SAP/volumes) | `radar/collector.js`, `radar/scheduler.js`, file Redis | charge | RADAR |

⭐ **P1 est le tournant** : à partir de là, le graphe se peuple réellement en prod sur Dolibarr — la première brique « Palantir » visible. **P0→P4 livrent la mémoire + la visualisation/traçabilité** (le cœur de cette demande). P6→P8 livrent le premier apprentissage mesurable. Le reste densifie la couverture.

---

## 12. Checklist « rien oublié » (mappée à la demande)

- [x] **Plans respectés** : ce doc fusionne `RADAR_CERVEAU_ULTRAPLAN.md` + `RADAR_ONTOLOGIE_GENERIQUE.md` avec le code.
- [ ] **Tous les systèmes connecteurs** : watch déclarées (pilotes) + apprises (universel) — P2/P5/P13.
- [ ] **IA / modèles** : graphe (1), feedback (2), kNN/distillation (3), risk/process (4), pertinence (5) + mapping appris — P1/P6/P7/P10/P11.
- [ ] **Liens / graphe** : RadarEntity/Relation + UI vflow — P1/P3.
- [ ] **UI/UX / interface** : onglets Graphe, Données & Schémas, Apprentissage, enrichissement Activité/Connecteurs/Board — P3/P4/P8.
- [ ] **Wizard de configuration** : parcours complet + permission contenu + reset — P9/P12.
- [ ] **Suivi / traçabilité** : lignée raw→ontologie, activité temps réel, santé, maturité — P4/P8.
- [ ] **Optimisation** : CDC, distillation, linker incrémental, cache — P7/P15.
- [ ] **Propositions** : cards réactives + prédictives + pertinence + autonomie — P10/P11.
- [ ] **Unifié avec l'existant** : aucun système parallèle ; on étend collector/scheduler/significance/superviseur/radar-page/radar-backend/gating env.
- [ ] **Gating env** : tout sous `RADAR_ENABLED` (+ sous-flags), invisible si off — transversal.

---

*Document généré le 16/06/2026 — ULTRAPLAN MAÎTRE d'exécution, ancré sur le code réel
(collector/scheduler/significance/superviseur, graphe Étage 1 déjà construit & testé,
UI radar à 6 onglets, gating `RADAR_ENABLED`). Référence d'exécution unique ; les deux
docs de vision restent la justification conceptuelle.*
