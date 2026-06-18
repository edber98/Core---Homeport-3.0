# KINN Radar — État vs système « type Palantir » (analyse d'écart)

> Question : sommes-nous prêts pour un système type Palantir de l'entreprise, ou
> manque-t-il des points ? Réponse honnête : **non, pas encore** — mais la moitié
> « interface + automatisation réactive » est solide et testée ; c'est la moitié
> « cerveau » (ontologie + graphe + modèles + boucle d'apprentissage + échelle)
> qui reste à construire. Aujourd'hui on est au stade **« assistant qui propose »**,
> pas **« système qui anticipe »**.

---

## 1. Les 8 piliers d'un système type Palantir — scorecard

| Pilier | État | Détail |
|---|---|---|
| **1. Ontologie** (couche sémantique : objets, propriétés, liens, actions) | ❌ MANQUANT | On a des snapshots plats par provider. Pas de registre d'ontologie, pas de types canoniques. Les actions (écritures providers) existent mais ne sont pas reliées à une ontologie. |
| **2. Knowledge Graph** (entités + relations, dédupliquées) | ❌ MANQUANT | Aucun nœud/arête. Les liens (facture→client→commande) n'existent nulle part ; chaque mission les reconstruit à la main (cas ITBS : 30+ appels). |
| **3. Intégration de données** (brancher n'importe quelle source → ontologie) | 🟡 PARTIEL | 35 providers équipés (blocs radar **écrits à la main**), ~10 familles. Mais : pas de `RadarMapping` appris, pas d'inférence LLM pour les logiciels inconnus, pas de CDC → collecte **polling fetch-all+diff** (échelle PME seulement). |
| **4. Modèles** (ML, forecasting, classifieurs appris) | ❌ MANQUANT | Seulement des heuristiques déterministes (z-score, dérive CA, tréso dans `reconciliations.js`). Aucun embedding, k-NN, modèle de risque, ni distillation LLM→modèle. |
| **5. Boucles de feedback** (apprentissage continu) | ❌ MANQUANT | Le feedback est **capté mais éparpillé** (`card.userResponse`, `delta.classification`). Pas de dataset centralisé, pas de réentraînement, pas de registre de modèles. |
| **6. LLM comme interface** | ✅ FAIT | Superviseur auto-promptant, chat, missions (runHarness), board. Testé. |
| **7. Couche opérationnelle** (alertes, validation human-in-loop, workflows) | ✅ FAIT | Signaux, board, boucle Valider/Modifier/Refuser, playbooks, missions. Testé (90 tests). |
| **8. Sécurité / gouvernance / multi-tenant** | ✅ FAIT | Isolation par workspace, crédits IA, permissions, flag d'activation, reset admin. |

**Lecture** : 4 piliers verts (l'opérationnel et l'interface), 1 partiel (l'intégration), 3 rouges (ontologie, graphe, modèles+feedback). Les 3 rouges sont **précisément ce qui fait un Palantir** : la mémoire reliée et les modèles qui apprennent. Sans eux, on a une excellente automatisation pilotée par LLM, pas un cerveau.

---

## 2. Ce qui est RÉELLEMENT construit et testé (à ne pas refaire)

- **Observation déterministe** : collecteur, snapshots, deltas (created/updated/deleted), scheduler avec verrou multi-instance, backoff. *(échelle PME)*
- **Filtre de significance** 2 étages (règles + LLM léger) avec sourdine et traçabilité.
- **Superviseur** événementiel auto-promptant + **missions** de fond (runHarness, critique, retry) + **board** server-driven avec validation + **playbooks** (procédures NL) + **savoir** (clé/valeur) + **chat** temps réel + **agenda** (FullCalendar) + **reset** admin + **flag** d'activation.
- **Réconciliations** déterministes (la seule brique « modèle » : z-score achats, dérive CA, tréso).
- **35 providers** équipés (blocs radar déclarés) sur ~10 familles ; **production Dolibarr** complétée (BOM + MO créés et testés en réel).
- **Facturation IA** branchée (mêmes crédits que l'assistant). **90 tests** verts.

C'est la fondation « réactive » : ça observe, ça trie, ça propose, ça exécute après validation, ça apprend des procédures. Solide. Mais ça **ne relie pas** les données et ça **n'apprend pas** de modèles.

---

## 3. Ce qui MANQUE pour atteindre le « type Palantir » (chemin critique)

Par ordre de dépendance — chaque étage débloque le suivant :

### Étage 1 — La MÉMOIRE reliée (le plus urgent, fondation de tout)
- `RadarOntologyType` (registre des 8 coreTypes + sous-types) · `RadarEntity` · `RadarRelation`.
- Le **linker déterministe** : transforme les snapshots déjà collectés en graphe.
- **Sans ça, rien de « Palantir » n'est possible** : ni modèles sur entités, ni
  process mining, ni anticipation. C'est le prérequis n°1.

### Étage 2 — L'adaptateur universel (`RadarMapping`)
- Mapping raw→ontologie, **déclaré** (pilotes) ou **appris par LLM** (couverture
  universelle, SAP compris). Rend le système agnostique au logiciel.

### Étage 3 — Le DATASET de feedback (`RadarFeedback`)
- Centraliser toutes les décisions humaines (validate/dismiss/modify/answer) en
  dataset étiqueté avec features. Le carburant de l'apprentissage.

### Étage 4 — Les MODÈLES qui remplacent le LLM (`learning/` + `RadarModel`)
- Embeddings + k-NN + `predict-or-ask` : distiller le tri, la classification
  (fournisseur SFR), la pertinence. Mesurer le **« % décisions sans LLM »**.
- C'est le tournant : on passe de « tout-LLM » à « modèles + LLM en filet ».

### Étage 5 — Forecasting & process mining
- `RadarRiskModel` (retard, risque), `RadarProcess` (Devis→…→Paiement), anomalies
  étendues. La capacité d'**anticipation** proprement dite.

### Étage 6 — Échelle (CDC) & temps-réel industriel
- Push/webhooks > curseurs `modified_since` > scan paginé+hash ; un flux = un job.
- `Measurement` (séries capteurs) pour l'IoT/MES. Indispensable au-delà de la PME
  (SAP, millions de lignes, capteurs).

---

## 4. Points de vigilance / dette à traiter en passant

- **Échelle** : la collecte actuelle (fetch-all + diff mémoire) ne tient pas à des
  millions de lignes — à migrer en CDC avant tout volume industriel.
- **Couverture plugins** : ~80 plugins métier à équiper (marketing, ecommerce,
  payment, social, analytics, telephony, devops, industry…) — via mapping appris.
- **Résolution d'identité** : la déduplication d'entités cross-connecteurs (même
  client dans Odoo+mails+Nextcloud) n'existe pas — clé du graphe.
- **Lecture de contenu** permissionnée (fichiers, OCR) + `RadarDocumentContent` :
  à construire pour classer des PDF (factures, contrats).
- **Wizard de settings** complet (onboarding multi-familles) : conçu, pas codé.

---

## 5. Verdict

| | |
|---|---|
| **Prêt comme « assistant proactif qui propose » ?** | ✅ OUI — observe, trie, propose, exécute après validation, suit des procédures. Testé. |
| **Prêt comme « cerveau d'entreprise type Palantir » ?** | ❌ NON — il manque la mémoire reliée (graphe), les modèles appris et la boucle d'apprentissage. Tout est planifié, rien n'est codé. |
| **Chemin le plus court vers le cap** | Étage 1 (ontologie + graphe) → 3 (feedback) → 4 (première distillation). À ce moment-là, on bascule d'« assistant » à « système qui apprend l'entreprise ». |

**Recommandation** : démarrer l'**Étage 1 (le graphe mémoire)** sur Dolibarr (qui
couvre maintenant 5 familles + production). C'est la fondation, ça donne une
valeur visible immédiate (graphe + missions qui lisent le graphe), et ça ne touche
à rien de l'existant — ça lit juste les snapshots déjà collectés. Les seeds/tests
sur Dolibarr et les autres logiciels viendront valider chaque étage au fur et à
mesure.

*Document généré le 16/06/2026 — état du code Radar vs cible Palantir (ontologie/graphe/modèles/feedback/CDC). Complète RADAR_CERVEAU_ULTRAPLAN.md et RADAR_ONTOLOGIE_GENERIQUE.md.*
