---
name: kinn-endpoint-coverage-auditor
description: Auditer un connecteur Kinn existant a partir d un JSON d endpoints deja filtre pour l automation, et produire un rapport covered missing excluded sans overlap avec l extraction, le filtrage ou la creation du connecteur. Utiliser quand un utilisateur demande un audit de couverture, un gap analysis, un "qu est ce qu il manque", ou une verification 100% metier sur un connecteur dans API/src/plugins/repos.
---

# Kinn Endpoint Coverage Auditor

## Objectif

Auditer un connecteur existant contre un JSON d endpoints deja filtre pour l automation.
Le skill ne doit ni extraire la doc, ni re-filtrer les endpoints, ni creer directement les noeuds manquants.

Entree attendue:

- un connecteur existant sous `API/src/plugins/repos/{connector}`;
- un JSON produit par `automation-endpoint-pruner`.

Sortie attendue:

- un rapport `covered / missing / excluded`;
- une liste des gaps reels;
- un verdict de couverture metier.

## Position dans le pipeline

Ce skill intervient apres:

1. `openapi-extractor`
2. `automation-endpoint-pruner`
3. `kinn-connector-creator`

Il sert a mesurer l ecart entre:

- le JSON filtre cible;
- le connecteur reellement present dans le repo.

## Workflow standard

1. Lire le JSON filtre de reference.
2. Lire `manifest.json` du connecteur cible.
3. Rejouer la meme logique de mapping que le generateur `endpoints JSON -> spec`.
4. Comparer chaque endpoint attendu avec les `nodeTemplates` existants:
   - `COVERED`: le noeud attendu existe;
   - `MISSING`: le noeud attendu n existe pas;
   - `EXCLUDED`: endpoint deja exclu dans le JSON source.
5. Pour les endpoints couverts avec body, verifier aussi les champs body attendus vs exposes.
6. Produire un rapport JSON et un resume lisible.

Commande de base:

```bash
node .agents/skills/kinn-endpoint-coverage-auditor/scripts/audit-coverage.js \
  <connector> \
  <api-name>-automation-endpoints.json
```

## Regles

- Ne pas reclasser arbitrairement un endpoint metier en admin si le JSON filtre l a garde.
- Ne pas ajouter de noeud directement depuis ce skill.
- Si des gaps sont detectes, les reporter puis deleguer la correction au `kinn-connector-creator`.
- Le skill peut auditer plusieurs connecteurs dans un meme tour, mais reste en lecture seule.

## Quand utiliser ce skill

Utiliser ce skill quand la demande ressemble a:

- "qu est ce qu il manque dans ce connecteur"
- "fais un audit de couverture"
- "est ce qu on est a 100% metier"
- "compare le connecteur au JSON filtre"
- "donne moi les endpoints manquants"

## Format du rapport final

Toujours fournir:
- `Coverage metier`: X/Y (%)
- `Endpoints couverts`: liste simple ou total
- `Endpoints manquants`: liste simple
- `Endpoints exclus`: liste + motif court
- `Body attributes couverts`: pour chaque endpoint couvert avec body, attributs attendus, trouves, manquants
- `Validation`: manifest parse
- `Gap residuel`: ce qui manque encore pour atteindre 100% metier

## References

Lire `references/exclusion-rules.md` seulement pour comprendre les exclusions deja presentes dans le JSON source.
Utiliser `scripts/audit-coverage.js` pour generer le rapport d audit.

## Limite volontaire

Ce skill n a plus pour mission de combler les gaps.
Sa mission est uniquement de les detecter proprement.
