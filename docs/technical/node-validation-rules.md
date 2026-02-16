# Règles de validation des nœuds (Backend)

Ce document liste les règles que le backend doit vérifier à chaque modification d’un flow (création/édition de nœud, mise à jour de template, import, etc.) et précise si elles sont bloquantes lors de l’exécution.

Terminologie:
- NodeModel: structure du nœud dans le graphe (id, template, templateObj, context, flags…)
- Template: gabarit du nœud référencé par `NodeModel.template` (ou `templateObj` inlined)
- Args: schéma de formulaire `template.args` décrivant les champs/validateurs requis
- Checksum: hash de `template.args` persisté sur le nœud (NodeModel.templateChecksum)
- FeatureSig: signature “options” persistée (NodeModel.templateFeatureSig) = `authorize_catch_error` + `authorize_skip_error`


## 1) Intégrité du template

- Existence du template (par id) et type valide (`start` | `function` | `condition` | `loop` | `end` | `flow`).
  - Bloquant à l’exécution: OUI (un nœud sans template est inévaluable)

- Alignement des checksums (drift de schéma d’arguments):
  - Calculer `argsChecksum(template.args)` et comparer à `NodeModel.templateChecksum`.
  - Si différent: drift détecté (nouveau schéma côté template).
  - Bloquant à l’exécution: OUI (le nœud doit être mis à jour pour éviter les incohérences de saisie).

- Alignement des options (feature flags):
  - Construire `featureSig = (authorize_catch_error? '1':'0') + (authorize_skip_error? '1':'0')` et comparer à `NodeModel.templateFeatureSig`.
  - Si différent: les options du template ont changé depuis la création du nœud.
  - Bloquant à l’exécution: OUI (le nœud doit être mis à jour afin d’appliquer les bonnes règles catch/skip).


## 2) Autorisations et ACL (Allowlist de templates par workspace)

- Vérifier que `template.id` du nœud est autorisé dans le workspace courant (allowlist côté ACL).
  - Bloquant à l’exécution: OUI (refuser l’exécution s’il y a un template non autorisé pour ce workspace).


## 3) Options de gestion d’erreurs (catch/skip) et cohérence

- Utilisation de `catch_error` (niveau nœud) requiert que `template.authorize_catch_error == true`.
  - Bloquant à l’exécution: OUI si `catch_error == true` mais non autorisé par le template.

- Utilisation de `skip_error` (niveau nœud) requiert que `template.authorize_skip_error == true`.
  - Bloquant à l’exécution: OUI si `skip_error == true` mais non autorisé par le template.

- Mutuelle exclusivité: `catch_error` et `skip_error` ne peuvent pas être actifs simultanément.
  - Bloquant à l’exécution: OUI (config invalide).

- Nœud `flow` (appel de sous-flow):
  - Vérifier que le `flowId` ciblé existe, appartient au même workspace, et passe les validations bloquantes.
  - Bloquant à l’exécution: OUI si `flowId` absent/inexistant/hors workspace.
  - UI: le champ `flowId` est fourni par la palette (groupe “Workflows”), prérempli et désactivé (non modifiable). Le backend ne doit pas compter sur une saisie utilisateur ici.

- Manque de branche “err” connectée quand `catch_error == true`:
  - Bloquant à l’exécution: NON (exécutable; la branche err non connectée sera simplement ignorée si une erreur survient).

- Semantique d’exécution recommandée:
  - Si l’implémentation de l’étape lève une erreur:
    1) Si `skip_error == true`: ignorer l’erreur et poursuivre l’exécution via la première sortie “non-err” (par convention: handle index 0).
    2) Sinon si `catch_error == true`: router vers la sortie `err` si elle existe; si non connectée, continuer sans transition (no-op) ou consigner un warning.
    3) Sinon: erreur bloquante, le flow s’arrête.


## 4) Schéma d’arguments et champs requis

- Champs requis à partir des validators du schéma:
  - Inspecter `template.args` (fields/steps) et détecter les validateurs `{ type: 'required' }`.
  - Vérifier que `NodeModel.context` fournit une valeur non vide pour chaque champ requis.
  - Bloquant à l’exécution: OUI (config incomplète).

- Form invalid (si le frontend a marqué `NodeModel.invalid == true`):
  - Bloquant à l’exécution: OUI (le modèle ne satisfait pas ses validateurs).

- Champs optionnels manquants:
  - Bloquant à l’exécution: NON (warning recommandé).


## 5) Sorties et handles

- Fonctions (`type === 'function'`):
  - Liste des sorties = `template.output` (par défaut: 1 sortie de succès).
  - Si `catch_error == true` et `template.authorize_catch_error == true`, ajouter la sortie spéciale `err`.
  - Edges sortants doivent cibler des handles existants (`'err'` ou index numérique valide).
  - Bloquant à l’exécution: NON si des handles existent mais non connectés (le moteur peut continuer); OUI si un edge référence un handle inexistant (payload du flow invalide).

- Conditions (`type === 'condition'`):
  - Les sorties correspondent aux items déclarés dans `context[template.output_array_field || 'items']`.
  - Recommandé: chaque item possède un `_id` stable (préservé en frontend); le backend peut router soit par index, soit par `_id`.
  - Bloquant à l’exécution: OUI si un edge référence un handle qui ne correspond à aucun item (ni index ni `_id` valide).

- Start/End/Loop:
  - Start: aucune entrée, au moins une sortie (`out`).
  - End: aucune sortie; edges sortants doivent être absents.
  - Loop: sorties attendues (convention) `loop_start`, `loop_end`, `end` (ou définir selon l’implémentation serveur).
  - Bloquant à l’exécution: NON si des sorties non connectées; OUI si un edge référence un handle inexistant pour le type.


## 6) Règles de graphes (minimum recommandé côté backend)

- Un seul nœud de départ (`type === 'start'`) par flow.
  - Bloquant à l’exécution: OUI si multiple.

- Aucun cycle non contrôlé (DAG conseillé) sauf si le moteur supporte explicitement les boucles au niveau `loop`.
  - Bloquant à l’exécution: OUI si cycle détecté hors mécanisme `loop` officiel.

- Nœuds inaccessibles (non atteignables depuis Start):
  - Bloquant à l’exécution: NON (warning recommandé; ces nœuds ne s’exécuteront pas).


## 7) Mises à jour de template (drift) — protocole

- Au chargement d’un flow, pour chaque nœud:
  1) Charger le template courant (catalogue) et recalculer `argsChecksum` + `featureSig`.
  2) Si drift (args ou features): marquer nœud invalide et refuser l’exécution tant que non mis à jour.
  3) Exposer une API “update node to latest template” côté backend qui remplace `templateObj` par `template` courant et recalcule les checksums, en conservant le `context` (patch tolérant aux champs ajoutés/supprimés).


## 8) Classification récapitulative (exécution)

Bloquant (refuser l’exécution du flow):
- Template inexistant ou type invalide.
- Drift d’arguments (`templateChecksum` ≠ checksum(args)).
- Drift d’options (`templateFeatureSig` ≠ featureSig(template)).
- Template non autorisé pour le workspace.
- `catch_error == true` alors que `template.authorize_catch_error == false`.
- `skip_error == true` alors que `template.authorize_skip_error == false`.
- `catch_error == true` ET `skip_error == true`.
- Champs requis manquants (via `template.args.validators`).
- `NodeModel.invalid == true`.
- Edge référant un handle inexistant (function/condition/start/loop/end).
- Graph invalide (plus d’un Start, cycle non supporté).

Non bloquant (exécutable, mais warning recommandé):
- Sortie non connectée (ex: branche `err` non reliée).
- Nœuds inaccessibles.
- Champs optionnels manquants.


## 9) Notes d’implémentation (recommandations)

- Le backend doit recalculer les checksums/signes côté serveur pour éviter de faire confiance au client.
- Pour les champs requis, parser `template.args` et rechercher `validators: [{ type: 'required' }, …]` sur les champs (y compris dans `steps` et `sections`).
- Pour `skip_error`, définir clairement le handle de continuation en cas d’erreur (par convention: la première sortie non-err, i.e. index `0`).
- Pour `condition`, privilégier des handles stables basés sur `_id` si présents.
- Prévoir une API d’“auto-fix” (mise à jour de template) retournant le nœud corrigé pour que le client réconcilie l’affichage.
