# KINN Radar — du « tout-LLM » au cerveau d'entreprise

> **Thèse** : le LLM n'apprend presque jamais. Le vrai apprentissage de KINN vit
> dans une boucle **Observation → Action humaine → Feedback → Dataset →
> Modèle spécialisé → Meilleures décisions**. Le LLM devient l'**interface**
> (reformuler, raisonner sur le vraiment nouveau), pas le cerveau. Les tâches
> classifiables/prévisibles passent à des modèles maison nourris par l'historique.
>
> Ce document décrit comment faire évoluer le Radar (déjà construit, ~12 modèles,
> superviseur, missions, board, playbooks) vers cette architecture en 5 couches,
> de façon **incrémentale** : chaque couche réduit la dépendance au LLM et
> augmente la capacité d'anticipation, sans jamais casser l'existant.

---

## 0. Où on en est (l'acquis, à réutiliser)

Le Radar a déjà une partie des fondations — et la **preuve** que « modèle déterministe > LLM » fonctionne :

| Brique vision | Existe déjà ? | Localisation |
|---|---|---|
| Observation (events bruts) | ✅ Oui | `RadarSnapshot` (état par entité) + `RadarDelta` (changements created/updated/deleted, horodatés) |
| Significance (tri) | ⚠️ Règles + LLM | `radar/significance.js` — étage 1 règles, étage 2 LLM. À distiller. |
| ML-lite déterministe | ✅ Déjà ! | `radar/reconciliations.js` : z-score achats anormaux, dérive CA client, tréso. **Aucun LLM**, et ça marche. |
| Feedback humain | ⚠️ Épars | `RadarCard.userResponse` (validate/modify/dismiss/answer), `RadarDelta.classification`, requalify. Non centralisé en dataset. |
| Savoir structuré | ⚠️ Plat | `RadarKnowledge` (clé/valeur), `RadarPlaybook` (procédures NL). Pas un graphe. |
| Knowledge Graph | ❌ Non | — à construire (Niveau 1) |
| Modèles spécialisés entraînés | ❌ Non | — à construire (Niveau 3) |
| Process mining | ❌ Non | — à construire (Niveau 4) |
| Registre de modèles + boucle de réentraînement | ❌ Non | — à construire (Niveau 3-5) |

**Ce qui manque vraiment** : le graphe (mémoire reliée), le dataset de feedback
centralisé, et surtout le **mécanisme d'apprentissage** qui transforme les
validations en modèles qui se substituent au LLM.

---

## 1. Le choix technique structurant : comment « apprendre » sans usine ML

La stack est Node.js + MongoDB. On n'a pas (et on ne veut pas) d'usine
d'entraînement Python lourde par défaut. La bonne nouvelle : le pattern de la
vision — **« après 100 validations SFR, le système reconnaît SFR sans LLM »** —
se réalise très bien avec **embeddings + k-plus-proches-voisins (k-NN)**, sans
aucun entraînement de gros modèle :

```
Nouvel item (mail, facture)
   ↓ embedding (vecteur, ~1500 dims) — appel API embeddings, ~0,00001 €
   ↓ recherche du voisin le plus proche parmi les exemples DÉJÀ VALIDÉS
   ↓ similarité ≥ seuil → prédiction = label du voisin (ex: supplier=SFR), confiance = similarité
       → AUCUN LLM appelé
   ↓ similarité < seuil → fallback LLM → propose → l'utilisateur valide → l'exemple rejoint l'index
```

Pourquoi c'est le bon outil ici :
- **Zéro entraînement** : chaque validation enrichit immédiatement l'index. Le
  système s'améliore en continu, pas « une fois par mois ».
- **Explicable** : la prédiction est justifiée par « ressemble à la facture SFR
  du 12/04 que tu as validée » — pas une boîte noire.
- **Cheap** : l'embedding coûte ~1000× moins qu'un appel LLM de classification.
  À l'échelle d'une PME (quelques milliers d'items), un index brute-force cosinus
  en mémoire suffit ; au-delà, `hnswlib-node` ou MongoDB Atlas Vector Search.
- **Froid au démarrage géré** : tant qu'il n'y a pas d'exemples, on retombe sur
  le LLM (l'état actuel). La bascule est progressive et par-tâche.

Pour les tâches à **features tabulaires** (risque de retard, pertinence d'alerte),
on ajoute des modèles légers entraînables en JS pur (régression logistique /
bayésien naïf / arbres) — pas d'infra. Et pour le **process mining** avancé
(PM4Py), un job Python nocturne optionnel via le sandbox IA déjà en place.

**Registre de modèles** : `RadarModel` (type, version, métriques, seuils,
exemples d'entraînement, état actif/rollback). Tout passe par lui → traçable,
réversible, mesurable.

---

## 2. Niveau 1 — La Mémoire : le Knowledge Graph

> « Client A ├── Commande 123 ├── Facture 456 └── Ticket 789 / └── Projet XYZ ».
> Le LLM n'apprend rien ici : il lit la mémoire.

### Modèles
- **`RadarEntity`** : `{ workspaceId, type (client|supplier|order|invoice|ticket|project|employee|machine|contact|document), canonicalKey, label, aliases[], attributes{}, sources[{connectorId, providerKey, externalId}], firstSeenAt, lastSeenAt }`. Une entité **dé-dupliquée cross-connecteurs** (le client « Cartonnage du Château » est UN nœud, qu'il vienne d'Odoo, des mails, ou d'un dossier Nextcloud).
- **`RadarRelation`** : `{ workspaceId, fromId, toId, type (has_order|has_invoice|billed_to|relates_to|assigned_to|mentions|child_of), confidence, source (rule|llm|user), evidence[], createdAt }`.

### Construction (le « linker »)
- Un **extracteur par famille** tourne après chaque collecte : il prend les
  `RadarSnapshot` et en dérive entités + relations de façon **déterministe**
  (ex. `invoice.partner_id` → entité client + relation `billed_to` ; `invoice.order_id`
  → relation `has_invoice` ; un mail dont l'expéditeur matche un contact → `mentions`).
- **Résolution d'identité (entity resolution)** : clés fortes d'abord (SIRET,
  domaine email, n° de TVA, nom exact normalisé). Les fusions ambiguës (« ITBS »
  vs « IT-BS » vs « it-bs.fr ») sont **proposées à l'utilisateur** (card question)
  ou tranchées par similarité d'embedding au-dessus d'un seuil — et le verdict
  devient un exemple d'apprentissage (Niveau 2/3).

### Effet immédiat
Les missions et le superviseur **interrogent le graphe** au lieu de re-fouiller
les providers à chaque fois (le cas ITBS : 30+ appels `email_read`/`list` pour
reconstituer un fil → remplacé par une lecture de sous-graphe). Énorme gain de
coût, de latence, et de cohérence. Le LLM reçoit du contexte déjà relié.

---

## 3. Niveau 2 — Les Observations : le dataset de feedback

> Chaque action d'Edouard est enregistrée. « validate_relation / dismiss_alert /
> correct_invoice… ». Ça devient ton dataset.

### Modèle central
- **`RadarFeedback`** : `{ workspaceId, userId, at, action (validate|modify|dismiss|answer|requalify|relation_confirm|relation_reject|knowledge_edit), targetKind (card|signal|delta|relation|entity), targetId, taskType (supplier_classification|significance|alert_relevance|relation|process), features{}, label, rawBefore, rawAfter }`.
- On **centralise** ce qui est aujourd'hui épars (`RadarCard.userResponse`,
  `RadarDelta.classification`, requalify) en émettant un `RadarFeedback`
  structuré à **chaque** interaction. C'est le substrat d'apprentissage de
  TOUTES les couches supérieures.
- Chaque feedback embarque les **features** au moment de la décision (domaine
  expéditeur, mots-clés, montant, fournisseur, nouveauté…) pour pouvoir
  entraîner/indexer ensuite sans re-fetch.

### Principe
Rien n'est jeté. Une validation, un refus, une correction, un « ignore » répété
— tout est un signal d'entraînement étiqueté gratuitement par l'usage normal.
C'est exactement le `{ "user":"edouard", "action":"validate_relation", ... }` de
la vision, généralisé à toutes les tâches.

---

## 4. Niveau 3 — L'Apprentissage : les modèles qui remplacent le LLM

> Au début : LLM dit « SFR, confiance 75 % » → Edouard valide. Après 100
> validations : le système reconnaît SFR seul. Le LLM n'est plus nécessaire.

### Le moteur : `radar/learning/`
- **`embeddings.js`** : vectorise un item (texte normalisé : expéditeur + sujet +
  extrait + montant bucketisé). Provider configurable (API embeddings, ou modèle
  local). Cache par contentHash (un item ne s'embedde qu'une fois).
- **`knn-classifier.js`** : pour une `taskType`, index des exemples validés
  (`RadarFeedback` où label confirmé). `predict(features)` → `{ label, confidence,
  neighbors[] }`. Brute-force cosinus < ~5k vecteurs, sinon hnswlib.
- **`predict-or-ask.js`** : l'orchestrateur clé. Pour chaque tâche classifiable :
  1. modèle local → si `confidence ≥ seuil_haut` : **applique sans LLM** (ou
     auto-significance) ;
  2. `seuil_bas ≤ confidence < seuil_haut` : LLM en arbitre (moins de prompt,
     contexte des voisins fourni) ;
  3. `< seuil_bas` ou index vide : LLM complet (état actuel) ;
  4. dans tous les cas où l'utilisateur tranche → nouvel exemple → l'index apprend.
  Les seuils sont **par tâche et par workspace**, ajustés sur la précision mesurée
  (on garde un set de validation : « le modèle aurait-il prédit ce que l'humain a
  validé ? » → précision suivie dans `RadarModel.metrics`).

### Premières tâches à distiller (par ordre de ROI)
1. **Significance des mails** (le plus fréquent, le plus coûteux) : aujourd'hui
   100 % LLM. Après ~50-100 validations, le k-NN tranche le bruit récurrent
   (newsletters d'un expéditeur connu, notifs machines) sans LLM. → baisse直 du coût.
2. **Classification fournisseur/client** (le cas SFR de la vision) : extraction
   d'entité à partir d'un mail/PDF de facture.
3. **Catégorisation des tickets / demandes** (support).
4. **Résolution d'identité** (fusions d'entités proposées).

### Garde-fous
- Un modèle ne « prend la main » sur une tâche que si sa **précision mesurée
  dépasse un seuil** (ex. 95 % sur le set de validation) ET qu'il y a assez
  d'exemples. Sinon LLM. Bascule réversible (`RadarModel` rollback).
- **Dérive** : si la précision chute (l'entreprise change d'habitudes), on
  re-bascule automatiquement vers le LLM sur cette tâche et on ré-apprend.

---

## 5. Niveau 4 — Les Processus : découverte + prédiction

> PM4Py découvre Devis→Commande→Livraison→Facture→Paiement. KINN observe les
> retards et apprend « charge>80 % ET stock<10 % → retard probable ».

### Découverte de processus
- Les **traces** existent déjà : la suite des `RadarDelta` d'une entité est son
  cycle de vie (`invoice: draft → posted → paid`). On les agrège par type
  d'entité en **directly-follows graph** (miner léger en JS) → le processus réel
  observé, par client/fournisseur.
- Optionnel avancé : job **PM4Py nocturne** (sandbox Python déjà en place) pour
  conformance checking et variantes — exporté en `RadarProcess`.

### Prédiction
- **`RadarRiskModel`** : features (charge atelier, niveau de stock, historique de
  retards du fournisseur, jour du mois…) → probabilité de retard / risque.
  Régression logistique ou gradient boosting léger, entraîné nocturnement sur les
  cas passés (un retard = un label). Pas de LLM.
- Anomalies : on étend `reconciliations.js` (qui fait déjà z-score) avec des
  modèles saisonniers simples (moyenne mobile + écart-type par catégorie/mois).

### Sortie
Des signaux **prédictifs** (et non plus seulement réactifs) : « commande 123 :
risque de retard 82 % ». Le superviseur ne fait que les présenter et proposer
l'action.

---

## 6. Niveau 5 — Les Décisions : apprendre la pertinence

> Edouard ignore 4× une alerte « facture EDF > moyenne » → KINN apprend « alerte
> peu utile ». Edouard ouvre une alerte « fournisseur inconnu » → « alerte
> importante ».

- **`RadarRelevanceModel`** (par workspace) : features d'un signal (catégorie,
  entité, montant vs moyenne, nouveauté, expéditeur connu…) → score de pertinence,
  appris des `RadarFeedback` `dismiss` vs `open/handled`.
- Boucle directe avec le **filtre de significance existant** : ce qui est appris
  comme « toujours ignoré » est rétrogradé (urgence basse, ou agrégé au briefing
  hebdo) ; ce qui est « toujours ouvert » est promu. C'est le Niveau 5 original du
  premier plan (playbooks/autonomie) fusionné avec un modèle quantitatif.
- Toujours **explicable et réversible** : « j'ai baissé cette alerte car tu l'as
  ignorée 4 fois » + possibilité de réactiver.

---

## 7. Le rôle (réduit) du LLM — et comment on l'enferme dans son rôle

Après distillation, le LLM ne reçoit plus « débrouille-toi avec ces données
brutes ». Il reçoit un **objet de décision déjà calculé** par le graphe + les
modèles, et il fait UNIQUEMENT deux choses :

```json
{ "supplier": "SFR", "risk": 0.82, "forecast": "retard",
  "reason": ["charge atelier", "retard fournisseur"], "graph_context": {...} }
```
→ « Cette commande présente un risque de retard de 82 %, surtout à cause d'une
surcharge atelier et d'un délai fournisseur inhabituel. »

Les deux rôles légitimes du LLM :
1. **Reformulation / interface** : transformer l'objet de décision en langage,
   répondre dans le chat, composer les cards. (peu de tokens, déterministe en
   entrée)
2. **Le vraiment nouveau** : une situation jamais vue, sans modèle ni précédent
   dans le graphe → là le superviseur auto-promptant garde toute sa valeur. Mais
   c'est l'exception, pas la règle.

Concrètement, on **route** : pour chaque tâche, `predict-or-ask` décide si le LLM
est appelé. Au fil des mois, la part de décisions prises **sans LLM** monte (on
la **mesure** : `% de décisions auto` par tâche, affichée dans Radar > Activité)
— c'est l'indicateur de maturité du cerveau.

---

## 8. La boucle d'apprentissage (le cœur battant)

```
Observation (collector → snapshot/delta)
   ↓
Graphe (linker → entity/relation)
   ↓
Décision (predict-or-ask : modèle OU llm)
   ↓
Présentation (card / chat) — le LLM reformule
   ↓
Action humaine (validate / modify / dismiss / answer)
   ↓
RadarFeedback (dataset étiqueté)
   ↓
Réentraînement (k-NN : immédiat ; modèles tabulaires : nocturne/hebdo)
   ↓
RadarModel (nouvelle version, métriques, seuils)
   ↓
Meilleures décisions → moins de LLM → plus d'anticipation
   ↺ (retour en haut)
```

**Cadence** : k-NN apprend en temps réel (chaque validation indexée). Les modèles
tabulaires (risque, pertinence) se réentraînent la nuit ou la semaine via un
`radar/learning/trainer.js` lancé dans la fenêtre nocturne du scheduler existant.
Process mining : nocturne/hebdo. Tout versionné dans `RadarModel`.

---

## 9. Phasage réaliste (incrémental, jamais de big-bang)

**Phase A — Knowledge Graph (fondation mémoire)** · ~3-4 sem
`RadarEntity` + `RadarRelation`, linker déterministe par famille, résolution
d'identité par clés fortes, vue graphe dans l'UI (onglet « Mémoire »), et
bascule des missions vers la lecture du graphe. *Valeur immédiate : missions plus
rapides/cohérentes, moins d'appels providers.*

**Phase B — Dataset de feedback** · ~1-2 sem
`RadarFeedback` centralisé, émis à chaque interaction (rétro-branché sur cards,
signaux, requalify, fusions). Features capturées. *Aucune intelligence encore —
on accumule le carburant.*

**Phase C — Première distillation : significance** · ~3-4 sem
`embeddings.js` + `knn-classifier.js` + `predict-or-ask.js`, appliqués au filtre
de significance des mails. Seuils, set de validation, `RadarModel`, mesure du
« % sans LLM ». *Premier ROI visible : la facture LLM du tri baisse.*

**Phase D — Distillation classification entités** · ~2-3 sem
Fournisseur/client (cas SFR), tickets. Le graphe se peuple désormais en partie
sans LLM.

**Phase E — Processus & prédiction** · ~4-6 sem
Directly-follows miner JS, `RadarRiskModel`, signaux prédictifs (retard,
anomalies étendues). Option PM4Py nocturne.

**Phase F — Pertinence des décisions** · ~2-3 sem
`RadarRelevanceModel`, boucle avec la significance, suppression/promotion
apprises. Tableau de bord de maturité (« % décisions autonomes », précision par
modèle, dérive).

Chaque phase est **livrable seule** et **réduit la dépendance LLM** d'un cran.
A+B sont des prérequis ; C est le tournant (première substitution réelle).

---

## 10. Modèles & fichiers à créer (récap)

| Couche | Modèles Mongo | Modules `API/src/radar/` |
|---|---|---|
| 1 Mémoire | `RadarEntity`, `RadarRelation` | `graph/linker.js`, `graph/entity-resolution.js`, `graph/query.js` |
| 2 Observation | `RadarFeedback` | `feedback.js` (émetteur centralisé) |
| 3 Apprentissage | `RadarModel` | `learning/embeddings.js`, `learning/knn-classifier.js`, `learning/predict-or-ask.js`, `learning/trainer.js` |
| 4 Processus | `RadarProcess`, `RadarRiskModel` | `process/miner.js`, `process/risk.js` (+ option Python sandbox) |
| 5 Décisions | `RadarRelevanceModel` | `relevance.js` (boucle avec `significance.js`) |
| UI | — | onglets « Mémoire » (graphe), « Apprentissage » (modèles/maturité) dans `features/radar/` |

---

## 10 bis. Le mapping automatique : des adaptateurs APPRIS (LLM une fois, code à vie)

> « Le LLM pour l'auto-mapping des différents logiciels ; quand il trouve comment
> ça marche, il sauvegarde la méthode pour ne plus appeler le LLM. Et je veux que
> ça marche avec TOUS, y compris des outils industriels comme SAP. »

C'est la **même distillation que pour la classification**, appliquée à la
transformation/standardisation des données. Aujourd'hui, j'écris à la main le bloc
`radar` du manifest (capacité → template, champs à surveiller). Pour passer à
l'échelle « n'importe quel logiciel », on automatise :

### L'ontologie cible (le schéma canonique standard)
Un **modèle pivot** unique : `invoice = { id, amount_total, partner, state, date,
payment_state, … }`, `order`, `ticket`, `client`, etc. Tous les logiciels sont
mappés VERS cette ontologie. Le reste du Radar (graphe, modèles, forecasting) ne
voit jamais le format brut d'Odoo, de SAP ou de Sage — il voit le format pivot.

### L'adaptateur appris : `RadarMapping`
`{ workspaceId, providerKey, entityType, version, mappingSpec, checksum, samples,
learnedBy, status }`. Le `mappingSpec` est **déterministe** : correspondances de
champs, coercions de types, normalisations de valeurs (`"posted"|"1"|"PAID"` →
`paid`), extraction de la clé stable. Pas du langage, une spec exécutable.

### Le cycle (LLM = professeur, une seule fois)
1. **Découverte** : à la connexion d'un logiciel inconnu, le Radar échantillonne
   quelques enregistrements réels (5-10) via l'API du provider.
2. **Inférence (LLM, UNE fois)** : le LLM lit les échantillons et produit le
   `mappingSpec` vers l'ontologie (« le champ `BUKRS` de SAP = société, `WRBTR` =
   montant, `BLDAT` = date de pièce… »). Validé contre l'ontologie + testé sur les
   échantillons.
3. **Sauvegarde** : `RadarMapping` enregistré, versionné.
4. **Exécution (à vie, ZÉRO LLM)** : chaque enregistrement passe par le
   `mappingSpec` déterministe → format pivot. Des millions de lignes, instantané,
   gratuit.
5. **Dérive de schéma** : un `checksum` des champs sources détecte un changement
   (nouveau champ, renommage). Si dérive → ré-inférence LLM ponctuelle → nouvelle
   version du mapping. Exactement le pattern « ré-apprendre seulement quand le
   monde change ».

### Pourquoi ça marche pour SAP (et tout ERP industriel)
- SAP expose OData / CDS / BAPI : des schémas énormes et cryptiques (`VBAK`,
  `LIPS`, `BSEG`…) — c'est précisément là que le mapping manuel est un cauchemar
  et que l'inférence LLM apporte le plus. On mappe une fois, on exécute toujours.
- Le `RadarMapping` rend le système **agnostique au logiciel** : connecter un
  nouvel outil = brancher l'accès (auth/endpoint) + laisser le Radar échantillonner
  et inférer. Plus besoin d'un bloc `radar` codé à la main par logiciel.
- Le bloc `radar` manuel actuel devient le « cas connu rapide » ; l'inférence LLM
  est le « fallback universel » pour tout le reste.

---

## 10 ter. La détection de changement à l'échelle (millions de lignes) — CDC

> « Comment le système détecte les changements quand il y a des millions de
> données ? Il va pas tout mettre en tampon dans une loop, c'est problématique
> avec les différents connecteurs. »

**Tu as raison, et c'est LE point d'architecture à corriger.** Le collecteur
actuel (`radar/collector.js`) fait : *tout récupérer → charger tous les snapshots
→ diff en mémoire → écrire les deltas*. C'est parfait à l'échelle PME (milliers de
lignes) mais **ça ne tient pas** à des millions / du SAP. La solution est le
standard de l'industrie : **CDC (Change Data Capture)** — on ne scanne jamais
tout, on ne reçoit/demande QUE ce qui a changé. Par ordre de préférence :

**1. Push / événements à la source (idéal — zéro scan).**
- Webhooks (Stripe, HubSpot, Salesforce… émettent les changements).
- CDC base de données pour les ERP : SAP a les *Delta Queues ODP* / CDS change
  data capture ; les SQL ont le log-based CDC (binlog/redo, style Debezium) ou des
  change tables. On s'abonne au flux de changements.
- IMAP IDLE (mails), sync tokens (Google/CalDAV).
→ On ne reçoit que le delta. Des millions de lignes au repos = zéro travail.

**2. Pull incrémental par curseur (quand pas de push).**
- La quasi-totalité des API ont un `modified_since` / `updated_after` / token de
  delta. On stocke un **high-water mark** par flux `(connecteur, entité)` et on
  demande seulement « ce qui a changé depuis le curseur X ». SAP OData delta
  tokens, Salesforce `getUpdated/getDeleted`, etc.
→ Jamais de full-scan. C'est le plus gros levier de scalabilité.

**3. Scan paginé + hash (dernier recours, si aucun delta).**
- Pagination par curseur, **batch borné** (jamais tout en mémoire). Le `contentHash`
  est stocké **indexé en base** ; pour chaque page on compare le hash par
  enregistrement à un lookup indexé (ou un Bloom filter par `entityKey`). Seuls les
  hash changés produisent un delta. Backpressure sur les rate limits.

**Architecture multi-connecteurs (le « pas une grosse loop »).**
- Un **flux = un job** dans la file (bee-queue/Redis déjà présents) : chaque
  `(connecteur, entité)` est planifié indépendamment, avec sa concurrence et son
  watermark. Pas de boucle globale qui tient tout en RAM.
- **Upserts idempotents**, watermark persistant, reprise après crash. Un connecteur
  lent/en erreur n'impacte pas les autres.
- Les **snapshots** deviennent un cache d'état courant ; le diff est piloté par les
  changements entrants (CDC), pas par un re-scan.
- Pour les très gros volumes : les deltas alimentent une file → traités en flux
  (streaming) par le linker et les modèles, par lots, jamais d'un coup.

**Conséquence sur le plan** : la migration du collecteur actuel (fetch-all +
diff mémoire) vers ce modèle CDC (push > curseur > scan-hashé, jobs par flux +
watermarks) est une **phase d'industrialisation** à part entière, prérequise avant
de viser SAP ou des volumes industriels. À l'échelle PME actuelle, l'existant
suffit ; au-delà, le CDC est non négociable.

---

## 11. Risques & garde-fous

- **Coût embeddings** : marginal (~1000× moins qu'un LLM), mais on cache par
  contentHash et on n'embedde que ce qui sert à une tâche.
- **Qualité du graphe** : une mauvaise fusion d'entités pollue tout → résolution
  conservatrice (clés fortes, sinon on demande), et fusions **réversibles**.
- **Sur-confiance d'un modèle** : seuils de précision stricts avant substitution,
  détection de dérive, rollback automatique vers LLM. Le LLM reste le filet.
- **Froid au démarrage** : pas de régression — sans exemples, on est exactement
  l'état actuel (tout-LLM). La bascule est progressive et mesurée.
- **Explicabilité** : chaque décision automatique cite sa preuve (voisin validé,
  feature dominante) — jamais de boîte noire opaque pour l'utilisateur.
- **RGPD / vie privée** : embeddings et features stockés par workspace, isolés ;
  pas de corps de mail complet dans les vecteurs (extrait normalisé + features).

---

## 12. L'indicateur qui résume tout

Un seul chiffre à faire monter, par workspace et par tâche :

> **« % de décisions prises sans LLM, à précision ≥ 95 % »**

Au début : ~0 % (tout-LLM, état actuel). À maturité : la majorité du tri, de la
classification et de la priorisation est faite par le graphe + les modèles, et le
LLM ne fait plus que reformuler et traiter le nouveau. C'est la transformation
d'un assistant qui *propose* en un système qui *anticipe le fonctionnement
spécifique de l'entreprise* — exactement la boucle Palantir (Ontology + Graph +
Models + Feedback), avec le LLM comme simple interface.

*Document généré le 15/06/2026 — suite de RADAR_ENTREPRISE_ULTRAPLAN.md, ancré sur le code Radar existant (snapshots/deltas/reconciliations/feedback épars).*
