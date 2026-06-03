---
name: kinn-endpoint-coverage-auditor
description: Auditer un connecteur Kinn endpoint par endpoint et atteindre une couverture maximale des noeuds utiles a l automation (lecture, creation, mise a jour, execution metier) en excluant explicitement le parametrage, l administration, la configuration globale et les operations purement techniques. Utiliser quand un utilisateur demande "tout couvrir", "100%", "endpoint par endpoint" ou "ajoute tous les noeuds utiles" pour un connecteur dans API/src/plugins/repos.
---

# Kinn Endpoint Coverage Auditor

## Objectif

Atteindre une couverture operationnelle maximale d un connecteur, sans ajouter de noeuds de parametrage/admin.
Produire un verdict de couverture honnete avec liste des endpoints couverts, manquants, exclus et justification.
Par defaut, le skill doit viser `100% metier` et poursuivre les ajouts tant qu il reste des endpoints metier `MISSING`.

## Declenchement direct (one-shot)

Appliquer ce skill immediatement, sans demander un second prompt, quand la demande utilisateur ressemble a:
- "Ajoute tous les noeuds utiles (endpoint) a l automation ... fais un audit ..."
- "endpoint par endpoint", "tout ajouter", "il ne doit rien manquer"
- demande multi-connecteurs (liste de plusieurs connecteurs dans le meme message)

Dans ce cas:
1. Traiter tous les connecteurs cites dans le meme tour.
2. Ajouter directement tous les noeuds dedies `MISSING` (non custom).
3. Refaire un audit apres ajout et continuer jusqu a `MISSING = 0`.
4. Ne poser aucune question intermediaire sauf blocage technique reel.

## Regle de priorite

Prioriser toujours:
1. Endpoints metier utilises en workflow (create/read/update/delete, search/list, run/execute, import/export utile).
2. Endpoints relationnels entre objets metier (associer, dissocier, transitions d etat).
3. Endpoints d action unitaire frequente (approve, cancel, archive, retry, send, match, enrich, push/pull).

## Exclusions obligatoires (ne pas ajouter)

- Parametrage global, configuration de compte/projet/workspace.
- Gestion d identifiants, tokens, OAuth, API keys, webhooks d administration.
- Parametres d infrastructure et maintenance technique sans valeur workflow immediate.
- Endpoints internes, beta instables, ou non documentes de facon fiable.

## Workflow standard

1. Inventorier le connecteur:
   - Lire `manifest.json`.
   - Lister `functions/*.js`.
   - Extraire les `nodeTemplates` existants.
2. Construire la liste endpoint cible:
   - Source principale: doc API officielle.
   - Garder seulement endpoints metier (selon regles d exclusion).
3. Mapper endpoint -> noeud existant:
   - `COVERED`: endpoint deja represente.
   - `MISSING`: endpoint utile absent.
   - `EXCLUDED`: endpoint hors scope (parametrage/admin) avec raison.
4. Ajouter les noeuds `MISSING`:
   - 1 handler par action.
   - Nommage et structure alignes connecteur existant.
   - Champs args clairs, schemas sortie coherents.
   - Pour chaque endpoint acceptant un body, ajouter un champ distinct par attribut documente du body; ne pas utiliser un unique champ generique `body`/`payload`/`data`.
5. Valider:
   - JSON manifest parse.
   - `require()` de tous les handlers sans erreur.
6. Reporter:
   - Totaux `covered / missing / excluded`.
   - Liste des ajouts.
   - Risques restants.

## Mode Couverture Maximale (obligatoire si l utilisateur demande "max", "tout", "100%")

1. Construire une matrice exhaustive endpoint par endpoint depuis la doc officielle.
2. Classer chaque endpoint en `COVERED`, `MISSING` ou `EXCLUDED`.
2bis. Pour chaque endpoint avec body, extraire depuis la doc officielle la liste des attributs acceptes et les mapper explicitement aux champs du noeud.
3. Ajouter tous les `MISSING` metier dans le meme tour, sans attendre validation intermediaire.
4. Reboucler une seconde passe de verification; si un endpoint metier reste `MISSING`, continuer les ajouts.
5. Ne terminer que lorsque `MISSING = 0` sur le perimetre metier retenu.
6. Si plusieurs connecteurs sont demandes, boucler connecteur par connecteur puis publier un recap global unique.

Definition perimetre metier:
- Inclure CRUD, list/search, transitions d etat, actions unitaires frequentes, import/export utile aux workflows.
- Exclure strictement parametrage/admin/credentials/permissions/billing technique/global settings.

## Regles d implementation

- Reutiliser les helpers `utils.js` du connecteur avant de creer de nouvelles abstractions.
- Ajouter des noeuds dedies pour les endpoints metier frequents.
- Si la doc liste des proprietes de body, les exposer une par une dans `args.fields`; un champ JSON fourre-tout est interdit sauf si l API accepte reellement un blob opaque non documente.
- Ajouter aussi les endpoints metier moins frequents mais utiles en automation (pas seulement le top frequents).
- Marquer les risques (`write`, `destructive`) dans manifest quand applicable.
- Ne pas casser les noeuds existants ni renommer sans necessite.

## Format du rapport final

Toujours fournir:
- `Coverage metier`: X/Y (%)
- `Body attributes couverts`: pour chaque endpoint avec body, liste simple des attributs exposes dans le noeud
- `Endpoints ajoutes`: liste simple
- `Endpoints exclus`: liste + motif court
- `Validation`: manifest parse + handlers load
- `Gap residuel`: ce qui manque encore pour atteindre 100% metier

## References

Lire `references/exclusion-rules.md` avant de classer les endpoints limites.
Utiliser `scripts/build_coverage_template.js` pour generer un template de matrice couverture.


## Interdiction custom_request (obligatoire)

- Si l utilisateur demande une couverture complete endpoint par endpoint, ne pas ajouter de noeud `custom_request` (ou equivalent generique).
- La couverture doit etre composee exclusivement de noeuds dedies, un endpoint metier = un noeud explicite.
- `custom_request` est interdit meme en mode secours, sauf demande explicite de l utilisateur.
- En mode one-shot multi-connecteurs, l usage de `custom_request` est interdit sans exception.
