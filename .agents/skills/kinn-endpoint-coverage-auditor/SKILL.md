---
name: kinn-endpoint-coverage-auditor
description: Auditer un connecteur Kinn endpoint par endpoint et atteindre une couverture maximale des noeuds utiles a l automation (lecture, creation, mise a jour, execution metier) en excluant explicitement le parametrage, l administration, la configuration globale et les operations purement techniques. Utiliser quand un utilisateur demande "tout couvrir", "100%", "endpoint par endpoint" ou "ajoute tous les noeuds utiles" pour un connecteur dans API/src/plugins/repos.
---

# Kinn Endpoint Coverage Auditor

## Objectif

Atteindre une couverture operationnelle maximale d un connecteur, sans ajouter de noeuds de parametrage/admin.
Produire un verdict de couverture honnete avec liste des endpoints couverts, manquants, exclus et justification.

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
5. Valider:
   - JSON manifest parse.
   - `require()` de tous les handlers sans erreur.
6. Reporter:
   - Totaux `covered / missing / excluded`.
   - Liste des ajouts.
   - Risques restants.

## Regles d implementation

- Reutiliser les helpers `utils.js` du connecteur avant de creer de nouvelles abstractions.
- Ajouter des noeuds dedies pour les endpoints metier frequents.
- Ajouter un noeud `custom_request` seulement comme complement, jamais comme argument de couverture dediee.
- Marquer les risques (`write`, `destructive`) dans manifest quand applicable.
- Ne pas casser les noeuds existants ni renommer sans necessite.

## Format du rapport final

Toujours fournir:
- `Coverage metier`: X/Y (%)
- `Endpoints ajoutes`: liste simple
- `Endpoints exclus`: liste + motif court
- `Validation`: manifest parse + handlers load
- `Gap residuel`: ce qui manque encore pour atteindre 100% metier

## References

Lire `references/exclusion-rules.md` avant de classer les endpoints limites.
Utiliser `scripts/build_coverage_template.js` pour generer un template de matrice couverture.
