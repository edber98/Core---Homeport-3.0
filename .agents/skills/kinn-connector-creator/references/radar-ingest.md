# Radar — rendre un connecteur OBSERVABLE (ingestion dans le cerveau)

Le « Radar d'entreprise » construit un graphe de connaissance (ontologie) à partir
de N'IMPORTE QUEL connecteur. Deux voies, complémentaires :

1. **Déclarée (pilote)** — on écrit un bloc `radar` dans le manifest + un mapping
   dans `API/src/radar/graph/mappings-*.js`. Rapide, déterministe, zéro LLM.
2. **Dynamique (générique)** — pour un connecteur inconnu (une base de données, un
   SaaS jamais vu), le LLM apprend le mapping ET la watch tout seul à partir des
   données réelles + du schéma de sortie déclaré. AUCUNE édition manuelle requise.

> Règle d'or : un nouveau logiciel ne doit JAMAIS exiger de hardcode métier. La voie
> déclarée n'est qu'une optimisation pour nos connecteurs pilotes.

## 1. Le bloc `radar` du manifest

Tableau de blocs, un par **famille** fonctionnelle (familles closes définies dans
`API/src/radar/families.js` : `accounting`, `crm`, `productivity`, `support`,
`catalog`, `industry`, `storage`, `email`, `database`…).

```jsonc
{
  "family": "catalog",                       // doit exister dans families.js
  "capabilities": {                          // capacité abstraite → template (handler) du connecteur
    "listProducts": { "template": "dolibarr_products_list" }
  },
  "watch": [                                 // ce que le collecteur va PULL périodiquement
    {
      "entity": "product",                   // rawEntityType du snapshot
      "via": "listProducts",                 // capacité à appeler
      "key": "id",                           // champ identifiant stable (→ entityKey)
      "hashFields": ["ref","label","price","stock_reel","type","status"]
                                             // champs surveillés : s'ils changent → un RadarDelta est émis
    }
  ]
}
```

- **Une famille = un type de connecteur Radar.** Un `RadarConnector` porte UNE
  famille. Pour ingérer plusieurs familles d'un même logiciel (Dolibarr fait
  accounting + crm + productivity + support + catalog), on crée plusieurs
  connecteurs Radar, un par famille.
- Ajouter une capacité dans un bloc `radar` IMPOSE de l'avoir déclarée dans le
  contrat de la famille (`families.js`), sinon `resolveCapabilityMapping` la rejette.
- `hashFields` = détection de changement. Pour des entités à **lignes** (factures),
  inclure le tableau (`"lines"`) sinon l'ajout/retrait d'un article ne déclenche pas
  de delta. (Côté dynamique, `buildWatchSpec` ajoute automatiquement `lineRules.arrayField`.)

Pipeline : `collector.js` lit les watch specs (`listWatchSpecs`) → appelle la
capacité (`execCapability`) → normalise en `RadarSnapshot` + émet des `RadarDelta`
sur changement → `linker.js` applique le `RadarMapping` → `RadarEntity` + `RadarRelation`.

## 2. Le `RadarMapping` (raw → ontologie)

LE seul endroit qui connaît les spécificités d'un logiciel. Champs clés :

- `target` : `{ coreType, subtype }` — coreType dans le squelette FERMÉ (9), subtype OUVERT.
- `keyField`, `identityFields` (siret/email/vat → dédup cross-logiciel), `labelField`.
- `fieldMap` : `{ champCanonique: champBrut }` (amount_total, date, state…).
- `valueMap` : traduit les CODES d'état en libellés FR (`{ state: { "0":"brouillon" } }`).
  Ne JAMAIS laisser un code brut visible côté UI.
- `relationRules` : relations par ID vers une AUTRE entité (l'info vit ailleurs et
  sera résolue quand cette entité sera synchronisée — voir §4). Relations closes :
  `party_of, part_of, derived_from, references, assigned_to, scheduled_for`.
- `lineRules` : itèrent un TABLEAU de lignes (facture/devis/commande) → une relation
  `references` (role `line_item`) par produit cité. C'est ce qui relie une
  transaction à ses ARTICLES et révèle les goulots de stock.
  `{ arrayField:"lines", viaField:"fk_product", qtyField:"qty", labelField:"product_label", targetCoreType:"Asset", targetSubtype:"product" }`
- `roleRules` : rôles conditionnels (`client=1` → rôle `client`).

> IMPORTANT modèle : tout nouveau champ du mapping doit être ajouté à
> `radar-mapping.model.js` SINON Mongoose le strippe au save (mode strict).

## 3. La voie DYNAMIQUE (LLM) — `learn-mapping.js` + `learn-watch.js`

`learnConnectorEntity({ connector, capability, entity })` :

1. échantillonne la capacité (données réelles) ;
2. **apprend le schéma depuis les données** (`inferSchema`) : type de chaque champ,
   optionnalité, et surtout les **tableaux d'objets** (= lignes probables) ;
3. récupère le **schéma de sortie DÉCLARÉ** du template (manifest/NodeTemplate) —
   signal fort qui révèle des champs absents des échantillons ;
4. `inferMapping` envoie tout ça au LLM → mapping complet (fieldMap, valueMap,
   relationRules, **lineRules**) ;
5. `buildWatchSpec` DÉRIVE la watch automatiquement depuis le mapping.

### Predict-or-ask (structure douteuse → on DEMANDE)

`inferMapping` n'auto-active (`status:'active'`) QUE si confiant et sans doute.
Sinon → `status:'draft'` + `reviewReasons[]` pour confirmation humaine. Signaux de doute :

- types hétérogènes d'un même champ entre échantillons (structure instable) ;
- tableau d'objets détecté mais AUCUN `lineRule` produit (lignes manquées ?) ;
- champ d'état sans `valueMap` (risque de codes bruts) ;
- sous-type métier nouveau inventé par le LLM (à valider).

La confiance est pénalisée par chaque doute ; `needsReview=true` route vers l'UI de
confirmation des brouillons.

## 4. Relations par ID où l'info est AILLEURS

Cas fréquent : une ligne de facture cite `fk_product: 9` mais les données du produit
(`label`, `stock`) sont dans `/products`. Le système gère ça nativement :

- `relationRules`/`lineRules` créent une arête vers une clé `provider:type:id`
  (ex. `dolibarr:product:9`) MÊME si l'entité cible n'est pas encore connue ;
- quand le produit est synchronisé (watch `product`), son entité reçoit cet ID en
  `aliasKeys` → l'arête se résout vers sa clé canonique forte.

Donc : pour qu'un lien par ID fonctionne, il faut que la cible soit AUSSI watchée
(d'où l'ajout du watch `product`). Si la liste ne contient pas les lignes, prévoir un
enrichissement par ID (GET détail) — non requis pour Dolibarr dont `/invoices`,
`/proposals`, `/orders` renvoient déjà `lines`.

## 5. Checklist « ajouter une famille/entité au Radar »

1. La famille existe-t-elle dans `families.js` ? Sinon l'ajouter (label + capacités + testCapability).
2. Ajouter le bloc `radar` (famille + capabilities→template + watch) dans le manifest.
3. Voie déclarée : ajouter le mapping dans `mappings-*.js` (penser valueMap + lineRules).
   Voie dynamique : rien à faire, le LLM s'en charge à la connexion.
4. Tout nouveau champ de mapping → l'ajouter au `radar-mapping.model.js`.
5. Tests purs dans `src/radar/__tests__/graph-unit.test.js`.
