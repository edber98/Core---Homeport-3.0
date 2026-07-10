# RADAR — ULTRAPLAN OPÉRATIONNEL V4

> **Vision** : le Radar devient « Celonis + Palantir + Pelico » d'une PME : process intelligence
> rigoureuse, graphe opérationnel actionnable, control tower qui propage les impacts et
> coordonne les actions — le tout alimenté par des **simulateurs d'entreprise** (fini les resets
> Dolibarr), enrichi par des **agents IA visibles en temps réel (SSE)**, et présenté dans une
> **UI pensée chef d'entreprise** (qu'est-ce qui compte, là, maintenant ?).
>
> Méthode inchangée et éprouvée : 1 phase = 1 Workflow de sous-agents parallèles + intégration
> + audit adversarial + build/verify verts. 17 modules déjà livrés ainsi (4 vagues).

---

## A. ACQUIS (validés sur données réelles) — on garde tout

Graphe ~2 300 entités / ~3 400 relations · cycle commercial complet (articles, prix/TVA, délais
de paiement 8-88 j) · contacts+niveaux N1/N2/N3 (works_at, to/cc) · fichiers↔pièces/dossiers/
clients · sentiment + clients à risque · 15 analyseurs (marge, RH, calendrier, audit, SLA,
supervision, temps réel, actions) · 5 prédicteurs back-testés (AUC 1.0/0.875, logreg entraînée
0.889) · RAG 366 docs propres + génération docx/xlsx/pdf · UI Pilotage/Dictionnaire/Documents.

## B. PROBLÈMES À RÉSOUDRE (constats Édouard)

| # | Problème | Phase |
|---|---|---|
| 1 | Dolibarr : marre des resets, données polluées, bugs API (propal lines, MO 500) | **S0 simulateurs** |
| 2 | Navigation mémoire cassée (fichier↛dossier depuis client, échantillonnage coupe les chaînes) | P1 |
| 3 | Processus découverts illogiques, à affiner sérieusement | P2 |
| 4 | Datamining insuffisant : « QUI pose problème et POURQUOI » (cohortes sectorielles) | P3 |
| 5 | Communications : détecter que **les échanges ralentissent avec telle personne / tel client / tel sujet** | P3 |
| 6 | Analyse documentaire « j'ai l'impression que ça ne fonctionne pas » → audit + refonte + **agents d'enrichissement des métadonnées** | P4 |
| 7 | Agents invisibles : il faut **voir les agents en cours**, SSE partout | P4 + S2 |
| 8 | Agent Radar ≠ assistant IA : un seul cerveau partagé | P5 |
| 9 | Pas de propagation d'impact (rupture stock → MO → commandes → clients touchés) façon Pelico | P5 |
| 10 | **UI trop complexe, parcours utilisateur mauvais** → refonte UX chef d'entreprise | P6 |
| 11 | Robustesse : tout tester, rien laisser passer, red team | P7 |

## C. INSPIRATIONS INTÉGRÉES

- **PM4Py / Apromore / XES** : le standard event log = (case id, activity, timestamp).
  → On exporte nos parcours en **XES**, et un **service Python PM4Py** (R5 enfin réalisé)
  fait la découverte rigoureuse (inductive miner) + conformance checking. Le miner JS reste
  pour le temps réel léger ; PM4Py pour la qualité.
- **Pelico (control tower MRO/supply)** : détection de perturbation → **propagation d'impact**
  dans le graphe (matière → OF → commandes → clients) → actions coordonnées proposées.
  Pas d'équivalent open source mûr → on le construit sur NOTRE graphe (c'est sa force).
- **FrePPLe/OpenMES** : concepts (WIP, OEE, réappro) repris dans le simulateur production.

---

## D. LE PLAN — 9 PHASES

### S0 — SIMULATEURS D'ENTREPRISE (« SimCorp ») ⭐ fondation nouvelle
Une **API séparée** (Node/Express + Mongo, même stack, dossier `Simulators/simcorp/`) qui
simule la suite logicielle d'une vraie entreprise. Le Radar s'y connecte par credentials
**comme à n'importe quel logiciel** (connecteur + watch). Fini les resets : `POST /admin/reset`
+ `POST /admin/generate` régénèrent un monde propre en secondes.

- **Modules simulés = FORMATS DES VRAIS LOGICIELS** (une API REST par « logiciel », auth par
  clé, payloads identiques aux vrais produits pour que l'auto-mapping affronte du réalisme) :
  - **ERP façon Dolibarr** : `/proposals`, `/orders`, `/invoices` avec `socid`, `total_ttc`,
    `statut`, `lines[{fk_product, qty, subprice, tva_tx}]`, `date_lim_reglement`… ;
  - **CRM façon HubSpot** : `/crm/v3/objects/{contacts|companies|deals}` avec `properties{}`,
    `associations`, `dealstage`, pipeline, paging `after` ;
  - **Production/assemblage façon MES** : ordres de fabrication (OF/work orders), BOM
    multi-niveaux (assemblage), postes/machines, OEE, mouvements de stock, gammes ;
  - Support (tickets, échanges), RH (employés, congés, pointage), Agenda (RDV),
    **Messagerie** (fils de discussion, to/cc, délais de réponse réalistes).
- **Générateur temporel** : simulation à tick (1 tick = 1 jour simulé) qui déroule 12-24 mois
  d'activité avec **patterns injectés et documentés** (la « vérité terrain » des tests) :
  - cohortes sectorielles (ex. vétérinaires → projets 2× plus lents) ;
  - une personne dont les réponses email RALENTISSENT progressivement sur un sujet ;
  - un fournisseur qui dérive (délais ↑) → ruptures de stock → OF bloqués → commandes en retard ;
  - clients churn silencieux, factures impayées par profil payeur, devis perdus par segment ;
  - erreurs de saisie (doublons, fautes d'orthographe, commande sans devis).
- **UI simulateur** (légère, servie par l'API : pages web autonomes) : se connecter, parcourir
  chaque module (listes + fiches), voir la timeline de génération — « je vois les données et
  cas que tu as créés ».
- **Scénario en fichier** : `scenario.json` déclare les patterns → les tests des phases 2-4
  vérifient que le Radar RETROUVE exactement ce qui a été injecté.
- ✅ Sortie : simulateur qui tourne, monde généré (≥ 30 clients, ≥ 300 pièces, ≥ 2 000 emails),
  UI navigable, reset 1 commande.

### S1 — CONNEXION RADAR ↔ SIMCORP (test ultime du « rien hardcodé »)
- Nouveau plugin `simcorp` : manifest + familles + watch. Les mappings sont créés par le
  **learn-mapping LLM** (logiciel inconnu → predict-or-ask), PAS déclarés à la main : c'est LE
  test de l'auto-mapping dynamique.
- Mode **temps réel** : le simulateur continue à générer (tick programmable) → le Radar ingère
  en incrémental → SSE pousse les changements à l'UI (R2 réel, plus simulé).
- ✅ Test : graphe complet depuis SimCorp sans un seul mapping écrit à la main ; verify-radar vert.
- (Dolibarr reste branché tel quel — on n'y touche plus, il devient un connecteur secondaire.)

### S2 — AGENTS VISIBLES + SSE PARTOUT
- **Registre d'agents** (`radar-agent-run.model`) : chaque tâche IA (classification, extraction
  doc, enrichissement métadonnées, mining, back-test) est un « run » avec statut/progression/
  résultat.
- SSE : le flux `/radar/stream` existant transporte les événements d'agents (started, progress,
  finished, error) + les changements de données (deltas) + les alertes supervision.
- **UI « Agents »** : panneau temps réel (qui tourne, sur quoi, depuis quand, résultat) +
  historique. Les analyses longues deviennent observables.
- ✅ Test : lancer un enrichissement → le voir progresser en live dans l'UI.

### P1 — MÉMOIRE CAUSALE NAVIGABLE
- Endpoint `graph/expand?key=X` : expansion PAR CAUSALITÉ (suit les liens par force
  décroissante) — fini l'échantillonnage aveugle qui coupe client→dossier→fichier.
- Clic nœud = charge ses voisins manquants ; fil d'Ariane causal ; Pilotage → drill-down
  (chaque carte cliquable ouvre l'élément dans la mémoire).
- ✅ Test : France Num → dossier Devis → Devis_(PROV24).txt en 3 clics, tous les sauts visibles.

### P2 — PROCESSUS FIDÈLES (XES + PM4Py)
- Audit du miner JS (agent dédié : liste chaque parcours illogique et sa cause).
- **Export XES** des event logs (case id = affaire/client, activity, timestamp métier).
- **Service Python `pm4py-service`** (FastAPI, dossier `Simulators/pm4py-service/`) :
  inductive miner, conformance checking, détection de déviations — appelé par l'API Node.
- Le front affiche les modèles découverts par PM4Py (petri→DFG simplifié) + conformité par cas.
- ✅ Test : le process injecté dans scenario.json ressort EXACTEMENT (bonnes étapes, bons délais) ;
  les déviations injectées (commande sans devis) sortent en non-conformité.

### P2b — SAVOIR D'ENTREPRISE (base normative VIVANTE) ⭐ nouveau
L'utilisateur EXPLIQUE au système comment l'entreprise devrait fonctionner ; le système s'en
sert comme référence ET le fait vivre.
- **Éditeur de savoir** (extension des onglets Savoir/Procédures existants) : procédures
  rédigées en langage naturel + workflows prescrits structurés (étapes, délais cibles,
  responsables) — ex. « tout devis > 5 k€ passe par validation direction ; facture émise
  sous 5 j après livraison ; relance impayé à J+15 ».
- **Modèle normatif → conformance** : les workflows prescrits sont compilés en modèles de
  processus (mêmes formats que P2/XES) → le conformance checking compare le RÉEL au PRESCRIT
  et signale chaque déviation (« la facture FA-12 a été émise à J+22 au lieu de J+5 »).
- **Injection dans le cerveau** : le savoir (procédures + infos entreprise : qui fait quoi,
  secteurs, règles métier) est injecté dans buildBrainContext → askRadar et l'assistant IA
  répondent en connaissant les règles de LA boîte, pas des généralités.
- **Savoir VIVANT** : quand la réalité dévie durablement (drift), le système PROPOSE une mise
  à jour de la procédure (« dans les faits, la validation direction n'existe plus pour les
  devis < 8 k€ — mettre à jour ? ») — predict-or-ask, versionné, jamais de modification muette.
- ✅ Test : une procédure prescrite volontairement différente du scénario simulé → toutes les
  déviations détectées ; l'évolution simulée → proposition de mise à jour correcte.

### P3 — DATAMINING EXPLICATIF + LATENCE DE COMMUNICATION ⭐
- `insights.js` : moteur de cohortes (lift, χ², support min) croisant dimension (secteur,
  personne, type projet, fournisseur) × problème (retard, impayé, churn, marge, tickets,
  sentiment) → « Les vétérinaires ont 2,3× plus de retards projet ».
- `comms-latency.js` : reconstruction des FILS d'échange (messagerie SimCorp), délai de réponse
  par (personne, client, sujet), **tendance** → « les échanges avec Marc sur le sujet “refonte
  ERP” ont ralenti de 1,2 j à 4,5 j sur 2 mois ».
- Boucle d'approfondissement LLM : pour chaque insight fort, lire les éléments de la cohorte
  (emails, tickets, docs) et proposer une CAUSE.
- Branché dans askRadar + carte Pilotage « Insights » + actions.
- ✅ Test : les patterns injectés (cohorte vétérinaire, personne qui ralentit) sont RETROUVÉS
  automatiquement avec les bons ordres de grandeur.

### P4 — INTELLIGENCE DOCUMENTAIRE V2 + AGENTS D'ENRICHISSEMENT
- **Audit complet** de l'existant (doc-queue/doc-index) : pourquoi « ça ne fonctionne pas » —
  couverture réelle, faux liens, docs non lus ; rapport chiffré.
- `doc-enrich.js` : agents qui LISENT les documents liés (cahier des charges → projet, contrat
  → client) et REMPLISSENT les métadonnées typées (`attributes.extracted`, predict-or-ask,
  file de revue UI). Chaque enrichissement = un run d'agent VISIBLE (S2).
- Les métadonnées extraites nourrissent le datamining (P3) et la recherche.
- ✅ Test : le cahier des charges seedé contient « BCT > 12 kg » → le projet porte la méta ;
  taux de couverture documentaire ≥ 90% des docs métier.

### P5 — CERVEAU UNIQUE + CONTROL TOWER (impact & coordination)
- **Un seul cerveau** : l'assistant IA (`API/src/ai/`) reçoit les tools `radar_brain`
  (askRadar), `radar_search` (dictionnaire), `radar_actions` (file R4) ; le chat Radar reçoit
  les tools génériques. Même contexte, mêmes réponses.
- **Propagation d'impact** (`impact.js`, façon Pelico) : depuis une perturbation (rupture
  stock, fournisseur en retard, personne absente), parcourir le graphe (BOM → OF → commandes →
  clients → factures) et produire l'ARBRE d'impact chiffré + actions coordonnées proposées
  (réappro, re-priorisation OF, prévenir clients X et Y).
- ✅ Test : la rupture injectée dans scenario.json produit l'arbre d'impact attendu (les bons
  clients touchés) et des actions cohérentes.

### P6 — REFONTE UI/UX « CHEF D'ENTREPRISE »
Principe : **3 questions du dirigeant** — Où en est-on ? Qu'est-ce qui cloche ? Que dois-je
faire ? Le reste est du détail progressif (progressive disclosure).
- **Accueil = Cockpit** (fusion Dashboard+Pilotage) : trésorerie, alertes triées, insights,
  file d'actions « à valider » — 1 écran, 0 jargon, tout cliquable (drill-down P1).
- Navigation resserrée : Cockpit · Explorer (mémoire+dictionnaire fusionnés) · Processus ·
  Agents (S2) · Réglages (connecteurs, mappings, docs). Les onglets actuels (10+) sont
  regroupés ; rien n'est supprimé, tout est ré-accessible.
- Parcours types testés : « pourquoi ma marge baisse ? » (3 clics), « qui dois-je relancer ? »
  (2 clics), « ce client est-il fiable ? » (recherche → fiche 360).
- Maquettes d'abord (HTML statique) validées par Édouard AVANT refactor Angular.
- ✅ Test : les 3 parcours chronométrés ; build 0 erreur ; anciennes routes redirigées.

### P7 — ROBUSTESSE FINALE (red team + CI)
- Workflow « red team » : agents qui CASSENT (workspace vide, volumes ×10, dates absentes,
  entités orphelines, simulateur qui envoie du malformé) — chaque crash = fix + test.
- Back-test automatique des modèles à chaque sync (métriques historisées via supervision) ;
  `verify-radar` complet en commande unique ; suite Jest sur les modules critiques.
- ✅ Sortie : rapport « système opérationnel » — 0 crash, métriques stables, démo scénarisée
  de bout en bout sur SimCorp.

---

## E. ORDRE & PARALLÉLISME

```
S0 (simulateurs) ──► S1 (connexion) ──► P2/P3/P4 (dépendent des données SimCorp)
S2 (agents+SSE)  ──────────────────────┘        (parallélisable avec S1)
P1 (mémoire causale) — indépendant, démarre en parallèle de S0
P5 après P3/P4 · P6 après P1/S2 (maquettes dès maintenant) · P7 en dernier
```

## F. DÉCISIONS TECHNIQUES (prises, sauf contre-ordre)

- **SimCorp** : Node/Express + Mongo (même stack, zéro friction), dossier `Simulators/simcorp/`,
  UI = pages web autonomes servies par l'API (pas de build Angular pour le simulateur).
- **PM4Py** : FastAPI Python isolé (`Simulators/pm4py-service/`), appelé en HTTP par l'API Node.
  Installation locale simple (pip). C'est la réalisation de R5.
- **XES** : format pivot des event logs (case id, activity, timestamp) — export depuis le graphe.
- **Dolibarr/OpenProject/Nextcloud** : restent branchés tels quels (réalisme multi-logiciels),
  mais on n'itère plus dessus — SimCorp devient le terrain de test principal.
- **Vérité terrain** : `scenario.json` du simulateur est LA référence des tests des phases 2-5.
