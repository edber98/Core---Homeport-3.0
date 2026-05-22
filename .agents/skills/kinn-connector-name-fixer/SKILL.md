---
name: kinn-connector-name-fixer
description: 'Corrige les noms de noeuds Kinn/Homeport sous API/src/plugins/repos en revue manuelle: l’agent doit parcourir chaque nodeTemplate, réécrire title/subtitle/description en français clair et métier, puis vérifier la cohérence globale sans traduction mécanique.'
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

1. Ouvrir `manifest.json` et parcourir `nodeTemplates[]` noeud par noeud.
2. Pour chaque noeud, corriger manuellement:
   - `title`: action claire en français (verbe d’action + objet métier).
   - `subtitle`: catégorie courte et compréhensible.
   - `description`: phrase claire décrivant l’action réellement effectuée.
3. Ne pas traduire mot à mot depuis la clé technique (`key`) ni empiler des synonymes. Prioriser le sens métier réel.
4. Harmoniser le style sur tout le connecteur (mêmes conventions de vocabulaire).
5. Vérifier/ajuster les doublons de titres si plusieurs noeuds ont le même libellé.
6. Valider le connecteur:

```bash
node .agents/skills/kinn-connector-creator/scripts/check-connector.js {connector}
```

## Règles de qualité (obligatoires)

- Le texte doit être naturel pour un humain non technique.
- Pas de fragments techniques bruts dans les libellés utilisateur (`get_xxx`, `list_xxx`, `patch`, `docs_api`, etc.).
- Pas de description mécanique de type "Action création créations ...".
- Une action = une intention explicite (ex: `Créer un déploiement`, `Lister les campagnes`, `Récupérer un contact`).
- Éviter les répétitions inutiles (ex: `Créer création`, `Lister liste`).
- Garder les acronymes utiles (`CRM`, `API`, `ID`) seulement si cela aide la compréhension.

## Optionnel: script d’aide

Le script `fix-connector-names.js` peut être utilisé comme point de départ rapide, mais ses sorties doivent être revues et corrigées manuellement noeud par noeud avant validation. Il ne doit jamais être considéré comme résultat final.

## Notes

- Les clés internes (`nodeTemplates[].key`, noms de handlers, variables) ne sont pas traduites.
- L’objectif du skill est la clarté UX, pas la traduction littérale.
