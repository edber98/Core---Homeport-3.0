# RADAR — Matrice d'état consolidée (audit multi-plans)

> Audit du 10/07/2026 — branche `feature/radar_scoring_ia`.
> Sources : audits par plan (RADAR_ENTREPRISE, RADAR_CERVEAU, RADAR_MASTER, RADAR_NEXT_INTELLIGENCE, RADAR_OPERATIONAL V4, RADAR_TEST_PLAN) + exécution live de `API/scripts/verify-radar.js` (pipeline complet OK, 3 450 entités, LLM réel).

---

## 1. Tableau global par plan

| Plan | Items | Fait | Partiel | Cassé / à-revoir | Pas-fait | Obsolète |
|---|---:|---:|---:|---:|---:|---:|
| RADAR_ENTREPRISE_ULTRAPLAN.md | 41 | **49 %** (20) | 24 % (10) | 7 % (3) | 12 % (5) | 7 % (3) |
| RADAR_CERVEAU_ULTRAPLAN.md | 31 | **32 %** (10) | 26 % (8) | 6 % (2) | 23 % (7) | 13 % (4) |
| RADAR_MASTER_ULTRAPLAN.md | 40 | **33 %** (13) | 33 % (13) | 8 % (3) | 25 % (10) | 3 % (1) |
| RADAR_NEXT_INTELLIGENCE.md | 14 | **36 %** (5) | 21 % (3) | 14 % (2) | 21 % (3) | 7 % (1) |
| RADAR_OPERATIONAL_ULTRAPLAN.md (V4) | 31 | **6 %** (2) | 6 % (2) | 6 % (2, dont 1 cassé) | **81 %** (25) | 0 % |
| RADAR_TEST_PLAN.md | 12 | **83 %** (10) | 0 % | 17 % (1 à-revoir + 1 cassé) | 0 % | 0 % |

**Lecture** : le socle (Entreprise + Test Plan) est largement livré ; le Master/Cerveau sont à moitié livrés avec la boucle d'apprentissage débranchée ; le plan V4 (Operational) est le plan d'exécution **non démarré** — c'est lui qui est censé corriger les trois dysfonctionnements signalés.

---

## 2. CE QUI MARCHE (prouvé)

Prouvé par le code branché + les tests + l'exécution live de `verify-radar.js` (aucune exception, bout-en-bout) :

- **Chaîne de collecte complète** : familles (9+industry), blocs `radar` des manifests, `capability-registry.js`, scheduler (verrou Mongo, backoff, quiet hours), collecteurs, snapshots/deltas, baseline. — `API/src/radar/scheduler.js`, `collector.js`
- **Graphe d'entreprise (Étage 1)** : ontologie pivot + RadarEntity/RadarRelation + linker déterministe branché au scheduler + mappings appris par LLM (`learn-mapping.js`, `autolearn.js`) + dérive de schéma (`drift.js`). Live : **3 450 entités, 17 types**.
- **Cycle commercial reconstruit** : 42 devis (22 signés/5 refusés), 37 commandes, 32 factures (16 payées), 16 paiements reliés ; deal-chains (Jaccard) ; backfill-lifecycle depuis les vrais timestamps Dolibarr.
- **Supervision proactive** : superviseur auto-prompté (briefing, launch_mission + critique + retry), signifiance 2 étages, wakeups, board de cards avec Valider/Modifier/Refuser + feedback, playbooks, knowledge, SSE `/radar/stream`, crédits IA sur tous les appels LLM.
- **Analyseurs & prédicteurs** : marge (CA 270 328 €, marge 49 %), RH/pointage, calendrier (237 événements, 21 RDV sans suite), SLA, audit divergences, sentiment (10 clients à risque), stock/goulots, doublons/cross-source (seuils 0.82/0.62), 8 prédicteurs `predict/` (DSO, churn, cashflow, win-rate, health, revenue) + onglet Pilotage.
- **RAG documentaire indexé** : 493 documents, 77 fichiers reliés à une pièce ; `askRadar` (vrai LLM) répond de façon cohérente avec sources.
- **Sécurité de base** : isolation workspace sur tous les modèles, écriture refusée par défaut (`allowWrite`), kill switch global + pause par connecteur.
- **Jeux de test** : seeds Dolibarr enterprise/HR/production + `seed-radar-real.js` (orchestration complète) + `verify-radar.js`.

---

## 3. CE QUI EST CASSÉ OU À REVOIR

### 3.1 Couvert par le plan V4 (RADAR_OPERATIONAL_ULTRAPLAN.md)

| Item | Preuve | Phase V4 |
|---|---|---|
| **Navigation Mémoire cassée** (chargement en bloc `getGraph(limit: 1200)` qui coupe les chaînes ; drill client→dossier→fichier impossible ; zéro drill-down depuis Pilotage) | `radar-graph.component.ts` L334 ; `graph/query.js neighborhood()` sans tri par force ; pas de route `graph/expand` | **P1** (expand par causalité, fil d'Ariane, drill-down) |
| **Process mining illogique** (parcours signalés incohérents par l'utilisateur malgré miner+discover+cross+sales branchés) | `process/miner.js` inchangé, aucun audit des parcours ; pas d'export XES ni conformance | **P2** (audit miner, XES, pm4py-service, conformance) |
| **Analyse documentaire défaillante** (couverture/faux liens/docs non lus non mesurés ; aucune indexation nocturne automatique) | `doc-index.js`/`doc-queue.js` uniquement à la demande (`POST /docs/index`) ; le plan V4 §B#6 acte le dysfonctionnement | **P4** (audit chiffré + `doc-enrich.js` + file de revue) |
| **Deux cerveaux IA séparés** (assistant IA général ignore le Radar) | grep `radar_brain\|askRadar` dans `API/src/ai/` = 0 | **P5** (tools radar_brain/search/actions) |
| **UI trop complexe** (13+ onglets, Dashboard et Pilotage séparés) | `radar-page.component.ts` L72-110 | **P6** (Cockpit + navigation resserrée) |
| Filtres segment/kind absents de l'écran Processus (backend `bySegment` calculé mais non exposé) | `radar-process.component.ts` L224 appelle `getSalesProcess(ws)` sans segment | Partiellement **P2/P6** (refonte vues process) |

### 3.2 NON couvert par V4 — à traiter en dehors du plan

| Item | Preuve | Gravité |
|---|---|---|
| **Suite de non-régression CASSÉE** : `graph-unit.test.js` échoue (`agendaevent → Event.event invalide` : `mappings-dolibarr.js` L98 cible un subtype absent de `ontology.js` L16) + échec `nameSimilarity` dans `analytics.test.js` | Régression introduite par le chantier calendrier/RH en cours ; fix probable : subtype `calendar_event` | **Haute** — bloque la confiance dans toute la suite |
| **CRM leads/prospects = 0** alors que le seed injecte des tiers `client=2` | `verify-radar.js` : « ⚠️ Leads/prospects (client=2) — mapping/ingestion à vérifier » ; mapping lead absent de `graph/mappings-dolibarr.js` | Haute — un pan du CRM invisible du cerveau |
| **Audit temps réel : score 0 avec 28 divergences (15 hautes)** — incohérence score non calculé ou affichage faux | sortie live `verify-radar.js` (I13) ; `audit-live.js` | Moyenne |
| **Modules backend orphelins** sans aucun consommateur frontend : `sla`, `deadlines`, `drift`, `supervision`, `learn-db`, `deal-chains`, `actions-queue`, `actions-preview`, `run-action`, `backtest`, `train-winrate`, `revenue-forecast` | absents de `radar-backend.service.ts` (grep) ; V4/P6 refond l'UI mais ne planifie pas leur câblage | Moyenne — code mort en production |
| **RH sans entités structurées** : congés/onboarding/recrutement/paie détectés par heuristique documentaire seulement (indices 5/5/5/52) | sortie live I11 ; pas de coreType RH peuplé | Moyenne |
| **Boucle d'apprentissage débranchée** : `RADAR_LEARNING_ENABLED` défaut OFF, feedback émis sur 2 interactions seulement, kNN jamais appelé en production, significance 100 % LLM, `adapt.js` jamais planifié (rien de nocturne) | `feedback.js` L9-11 ; grep knn/adapt dans `significance.js`/`scheduler.js` = 0 ; V4 ne réactive rien | Haute — le « cerveau qui apprend » n'accumule rien |
| **Marges : « affaires faible marge : 0 »** avec 57 projets et marge produit 30 % — seuil/calcul par affaire à contrôler | sortie live I10 | Faible (possible vrai zéro sur données seedées) |

---

## 4. OBSOLÈTE / REMPLACÉ (caduc, ne plus suivre les anciens plans)

| Item d'origine | Plan | Remplacé par |
|---|---|---|
| Missions durables sur AiJob (crash-resume, heartbeat) | Entreprise | Runner in-process + modèle `RadarMission` — **sans reprise après crash** |
| Journal `RadarActivity` (coût par réveil) | Entreprise | Vue agrégée live `GET /radar/activity` — **coûts non journalisés** |
| `RadarBoard` versionné + `update_board` | Entreprise | Vue calculée depuis les `RadarCard` + `post_card` (`board.js`) |
| `learning/embeddings.js` (API embeddings + cache) | Cerveau | `featurize()` bag-of-words hashé 96 dims dans `learning/knn.js` (zéro API) |
| `learning/trainer.js` nocturne | Cerveau | `runAdaptivePass` (`adapt.js`) — à la demande uniquement |
| Distillation k-NN classification fournisseur/client (cas SFR) | Cerveau | Mappings déterministes `RadarMapping` + classification LLM ponctuelle (`classify.js`) |
| `RadarRiskModel` | Cerveau | `learning/payment-risk.js` (logreg versionnée en `RadarModel`) + dossier `predict/` — plus large que le plan |
| `RadarDocumentContent` + permission `contentAccess` | Master P12 | `radar-doc-chunk` + RAG TF-IDF (`doc-index.js`) — **mais `contentAccess` jamais implémenté** et le remplaçant est à-revoir (P4 V4) |
| Processus support/projet codés en dur | Next Intelligence I4 | Découverte dynamique `process/discover.js` (noms générés par LLM) — hérite du signalement « illogique » |
| Socket.IO pour le temps réel /radar | Entreprise | SSE `GET /radar/stream` |

---

## 5. ANGLES MORTS (planifié nulle part, mais nécessaire)

Jugement d'auditeur — aucun des 6 plans (V4 compris) ne couvre :

1. **Durabilité des missions** : l'abandon d'AiJob n'a jamais été compensé — une mission en cours est perdue au redémarrage du serveur, sans reprise ni détection. Aucun plan ne re-planifie un mécanisme de resume.
2. **Observabilité des coûts LLM** : les crédits sont débités mais aucun journal coût-par-réveil/mission/passe n'existe (le journal RadarActivity a été remplacé par une vue live). Impossible de répondre à « combien coûte le Radar par jour et sur quoi ».
3. **Garde-fous quotas** : `RadarPolicy` (missions concurrentes max, réveils/h, tokens/jour) abandonné sans remplacement — seuls les crédits limitent ; un emballement du superviseur consommerait tout le budget avant blocage.
4. **CI bloquante sur la suite radar** : les 2 tests cassés dorment dans le working tree sans que rien n'alerte. Aucun plan ne prévoit l'exécution automatique de `__tests__/` + `verify-radar.js` en pré-merge.
5. **Validation mapping↔ontologie à l'écriture** : la régression `Event.event` montre qu'un mapping peut cibler un subtype inexistant sans être rejeté au moment de sa création/modification — la validation n'existe que dans les tests.
6. **Permissions d'accès au contenu documentaire** : le RAG indexe tout ce que le connecteur voit ; `contentAccess` n'a jamais été implémenté et le volet RGPD/permissions (S6) n'est repris par aucun plan actif.
7. **Activation par défaut de la boucle de feedback** : tous les plans supposent un dataset de feedback qui s'accumule, mais `RADAR_LEARNING_ENABLED` est OFF par défaut et aucun plan ne traite la migration vers « ON par défaut + couverture de toutes les interactions » (merge, relations, knowledge, réponses ask).

---

## Priorités suggérées

1. **Réparer la suite de tests** (subtype `calendar_event`, nameSimilarity) — 1 h, restaure la confiance.
2. **Corriger le mapping leads (client=2)** et l'incohérence score audit — bugs de données visibles en démo.
3. **Dérouler V4 P1→P2→P4** (navigation Mémoire, miner, documentaire) — les trois dysfonctionnements signalés.
4. En parallèle : activer le feedback par défaut + brancher `adapt.js` au nocturne, et câbler ou supprimer les routes orphelines.
