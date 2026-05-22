---
name: kinn-connector-name-fixer
description: 'Corrige manuellement les noms de noeuds Kinn/Homeport sous API/src/plugins/repos: revue noeud par noeud de tout le manifest, français intégral, sens métier clair, description distincte du titre, sans correction mécanique par script.'
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

1. Ouvrir `manifest.json` du connecteur cible et parcourir `nodeTemplates[]` intégralement, un noeud à la fois, sans en sauter.
2. Pour chaque noeud, vérifier si les champs sont entièrement en français et compréhensibles:
   - `title`: libellé d’action clair en français (verbe d’action + objet métier).
   - `subtitle`: catégorie courte et claire en français.
   - `description`: phrase explicative en français, utile pour l’utilisateur.
3. Corriger manuellement chaque noeud au cas par cas si nécessaire. La correction doit être contextuelle (sens métier réel), jamais automatique.
4. Interdiction de produire une `description` identique au `title` (même formulation ou reformulation triviale). La description doit apporter une information complémentaire.
5. Ne pas traduire mot à mot depuis la clé technique (`key`) ni empiler des synonymes. Prioriser le sens métier réel.
6. Harmoniser le style sur tout le connecteur (mêmes conventions de vocabulaire) et vérifier/ajuster les doublons de titres.
7. Valider le connecteur:

```bash
node .agents/skills/kinn-connector-creator/scripts/check-connector.js {connector}
```

## Règles de qualité (obligatoires)

- Revue exhaustive: tous les noeuds du `manifest.json` concerné doivent être relus et traités un par un.
- Le texte doit être naturel pour un humain non technique.
- Le `title`, le `subtitle` et la `description` doivent être rédigés en français.
- Pas de fragments techniques bruts dans les libellés utilisateur (`get_xxx`, `list_xxx`, `patch`, `docs_api`, etc.).
- Pas de description mécanique de type "Action création créations ...".
- Une action = une intention explicite (ex: `Créer un déploiement`, `Lister les campagnes`, `Récupérer un contact`).
- Éviter les répétitions inutiles (ex: `Créer création`, `Lister liste`).
- La `description` ne doit jamais être identique au `title` et doit clarifier ce que fait réellement le noeud.
- Garder les acronymes utiles (`CRM`, `API`, `ID`) seulement si cela aide la compréhension.
- Interdit: correction mécanique en masse par script ou génération automatique non relue.

## Notes

- Les clés internes (`nodeTemplates[].key`, noms de handlers, variables) ne sont pas traduites.
- L’objectif du skill est la clarté UX, pas la traduction littérale.
- Le travail attendu est une réécriture éditoriale manuelle, noeud par noeud, orientée utilisateur.
