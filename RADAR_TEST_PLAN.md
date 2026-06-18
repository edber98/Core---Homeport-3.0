# RADAR — Plan de test (jeu de données réel + cas à couvrir)

Objectif : garantir que le cerveau du Radar voit des **cycles de vie variés**, des
**chaînes d'affaire**, des **liens multi-sources**, des **anomalies** et des **goulots**
— sur de la VRAIE donnée (Dolibarr + OpenProject + Nextcloud), pas de la simulation.

Seed : `API/scripts/seed-dolibarr-enterprise.js` (peuple Dolibarr) puis
`API/scripts/seed-radar-real.js` (synchro + graphe + cycle de vie + inférences).

## 1. Cycles de vie (process mining « Par cycle de vie »)

Le seed force la VARIÉTÉ via un plan de cas par client (`CASES`) :

| Pièce | États à observer dans le DFG |
|---|---|
| Devis | brouillon → validé → **signé** ; brouillon → validé → **refusé** ; validé (seul) |
| Commande | brouillon → validée → **livrée** ; validée (seul) |
| Facture | brouillon ; brouillon → **émise** ; émise → **payée** ; émise **en retard impayée** |
| Projet | ouvert → fermé (si clôturé) |
| Tâche | à faire → en cours → terminée (selon progress) |
| Ticket | non lu → lu → **fermé** |

Reconstruction : `backfill-lifecycle.js` rejoue les transitions depuis les vrais
timestamps Dolibarr (date_creation, date_validation, date_cloture, date_paiement…).
→ Vérifier : chaque type a ≥ 2 états et ≥ 1 transition ; devis montre signé ET refusé.

## 2. Chaîne d'affaire (liens entre pièces principales)

- Lien natif si la facture est créée DEPUIS une commande (`origin_id`).
- Sinon inférence `deal-chains.js` : devis→commande→facture d'un même client reliés
  par recouvrement d'articles (Jaccard) ou montant identique.
- → Vérifier : une facture pointe (derived_from) vers sa commande et son devis.

## 3. Articles / stock / goulots

- Lignes de facture/devis/commande → relations `references` (line_item) vers produits.
- Produit NAS : stock volontairement bas (3) vs demande élevée → `findStockRisks` = goulot.
- Services (type=1) : pas de stock → exclus des risques.
- → Vérifier : ≥ 1 goulot de stock détecté ; les factures sont reliées à leurs articles.

## 4. Identité multi-sources

- Projet présent dans Dolibarr ET OpenProject (même client, nom proche) → fusionné
  en 1 entité à 2 sources (`cross-source.js`). Zone grise → suggestion à confirmer.
- → Vérifier : ≥ 1 projet fusionné ; aucune fusion abusive entre deals différents.

## 5. Anomalies & corrélation

- Factures en retard impayées → anomalies financières.
- Dossiers Nextcloud mal nommés / orphelins → near_miss / orphelin (`correlate.js`).
- Doublons (casse/typo/cross-système) → `findDuplicates`.
- → Vérifier : factures en retard listées ; au moins une near_miss avec suggestion.

## 6. Mapping dynamique (connecteur inconnu)

- Un logiciel sans mapping déclaré : `inferMapping` apprend depuis données + schéma
  déclaré, produit fieldMap/valueMap/relationRules/**lineRules**.
- Structure douteuse (types hétérogènes, lignes non mappées, état sans valueMap,
  sous-type nouveau) → mapping en **brouillon + reviewReasons** (predict-or-ask).
- → Vérifier : un échantillon à lignes produit des lineRules ; un champ instable → draft.

## 7. Nextcloud arborescence

- `nc_file_tree` : parcours récursif borné (profondeur + budget). Dossiers (Asset/folder)
  et fichiers (Document/file) reliés `part_of` à leur dossier parent.
- → Vérifier : dossiers ET fichiers présents, hiérarchie visible, budget respecté.

## Commandes

```bash
cd API
node scripts/seed-dolibarr-enterprise.js     # peuple Dolibarr (états variés)
PLUGIN_IMPORT_ENABLED=1 node scripts/seed-radar-real.js   # synchro + graphe + inférences
node --test src/radar/__tests__/*.test.js     # non-régression
```
