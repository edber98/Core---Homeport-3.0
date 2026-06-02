---
name: kinn-connector-name-fixer
description: 'Corrige manuellement les noms de noeuds Kinn/Homeport sous API/src/plugins/repos: traitement obligatoire et exhaustif noeud par noeud de tout le manifest, titres explicites en français sans symboles comme / ou -, descriptions courtes et claires orientées action, sans correction mécanique par script.'
---

# Kinn Connector Name Fixer

Use this skill when the user asks to fix naming in an existing connector manifest, for example:

- "corrige les noms de notion"
- "fix les titres des noeuds"
- "mets des noms clairs pour les actions"
- "supprime les doublons de noms des nodes"

Target file:

```text
API/src/plugins/repos/{connector}/manifest.json
```

## Workflow

1. Ouvrir `manifest.json` du connecteur cible et parcourir `nodeTemplates[]` intégralement, un noeud à la fois, sans en sauter, même si le connecteur contient plusieurs centaines ou milliers de noeuds.
2. Pour chaque noeud, vérifier si les champs sont entièrement en français et compréhensibles:
   - `title`: libellé d’action clair en français (verbe d’action + objet métier), sans symbole de séparation du type `/`, `-`, `_` ou formulation technique compacte.
   - `subtitle`: catégorie courte et claire en français.
   - `description`: courte phrase explicative en français qui dit clairement ce que le noeud fait comme action pour l’utilisateur.
3. Traiter chaque noeud individuellement. Même si un noeud semble deja correct, il doit etre relu explicitement puis conservé ou réécrit en connaissance du contexte métier.
4. Corriger manuellement chaque noeud au cas par cas si nécessaire. La correction doit être contextuelle, fondée sur le sens métier réel, jamais automatique ni par lot.
5. Réécrire chaque `title` pour qu'il soit immédiatement compréhensible par un humain non technique. Interdiction des titres ambigus, abrégés, télégraphiques ou construits avec des séparateurs symboliques.
6. Réécrire chaque `description` pour qu'elle explique en quelques mots l'action réelle du noeud. Interdiction de laisser une description vide, générique, tautologique ou quasi identique au titre.
7. Ne pas traduire mot à mot depuis la clé technique (`key`) ni empiler des synonymes. Prioriser le sens métier réel.
8. Harmoniser le style sur tout le connecteur (mêmes conventions de vocabulaire) et vérifier/ajuster les doublons de titres.
9. Valider le connecteur:

```bash
node .agents/skills/kinn-connector-creator/scripts/check-connector.js {connector}
```

## Règles de qualité (obligatoires)

- Revue exhaustive: tous les noeuds du `manifest.json` concerné doivent être relus et traités un par un.
- Cette exhaustivité reste obligatoire quelle que soit la taille du connecteur: 10, 100 ou 1000 noeuds ne justifient aucun traitement partiel.
- Le texte doit être naturel pour un humain non technique.
- Le `title`, le `subtitle` et la `description` doivent être rédigés en français.
- Le `title` doit être un vrai libellé explicite, lisible seul, sans symbole de structure du type `/`, `-` ou `_`.
- Le `title` doit exprimer clairement l'action et son objet métier, par exemple `Créer un contact` ou `Lister les factures`.
- Pas de fragments techniques bruts dans les libellés utilisateur (`get_xxx`, `list_xxx`, `patch`, `docs_api`, etc.).
- Pas de description mécanique de type "Action création créations ...".
- Une action = une intention explicite (ex: `Créer un déploiement`, `Lister les campagnes`, `Récupérer un contact`).
- Éviter les répétitions inutiles (ex: `Créer création`, `Lister liste`).
- La `description` doit expliquer en quelques mots ce que fait réellement le noeud pour l'utilisateur.
- La `description` ne doit jamais être identique au `title`, ni en copie, ni en reformulation triviale.
- Chaque `description` doit apporter une information concrète sur l'action: cible, résultat attendu ou usage métier immédiat.
- Garder les acronymes utiles (`CRM`, `API`, `ID`) seulement si cela aide la compréhension.
- Interdit: correction mécanique en masse par script ou génération automatique non relue.
- Interdit: décider qu'un échantillon suffit. Le skill impose une revue complète du connecteur, noeud après noeud.

## Notes

- Les clés internes (`nodeTemplates[].key`, noms de handlers, variables) ne sont pas traduites.
- L’objectif du skill est la clarté UX, pas la traduction littérale.
- Le travail attendu est une réécriture éditoriale manuelle, noeud par noeud, orientée utilisateur.
- Si l'utilisateur demande de corriger un connecteur ou "les noms d'un noeud", interpréter cela comme une revue intégrale de tous les noeuds du connecteur ciblé, pas seulement du noeud cité.
