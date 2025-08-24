# Sémantique d’exécution des flows (Backend)

Ce document décrit le comportement attendu du moteur d’exécution côté backend: nœuds, sorties, gestion des erreurs (try/catch, skip), conditions, boucles, et résolutions des branches quand un nœud possède plusieurs sorties.


## 1) Modèle de graphe (rappel)

- Nœuds: `start | function | condition | loop | end`.
- Arêtes: portent un `sourceHandle` (id de sortie) et optionnellement un label d’affichage.
- Sorties:
  - `start`: une seule sortie logique `out`.
  - `function`: sorties indexées `0..N-1`; si `catch_error == true` alors sortie spéciale `err` en plus.
  - `condition`: sorties dynamiques depuis `context[template.output_array_field || 'items']`. Chaque item idéalement a un `_id` stable (préservé par le frontend).
  - `loop`: recommandations ci-dessous.
  - `end`: pas de sortie.

Le frontend stocke, sur chaque nœud:
- `templateChecksum`: checksum des `template.args` au moment de la création/mise à jour du nœud.
- `templateFeatureSig`: signature des options du template: `authorize_catch_error` + `authorize_skip_error`.
- `catch_error` / `skip_error`: flags d’instance du nœud.

Le backend doit recalculez ces valeurs à l’ouverture/avant exécution pour sécuriser l’intégrité (voir document des règles de validation).


## 2) Contrat d’exécution d’un nœud (recommandation)

Interface exécuteur (pseudo-code TypeScript):

```
interface ExecResultOK {
  ok: true;
  next?: string | number;  // handle à emprunter; défaut: 0 pour function, 'out' pour start
  data?: any;              // payload à propager (optionnel)
}
interface ExecResultERR {
  ok: false;
  error: any;              // erreur levée par l’étape
}

function executeNode(node: NodeModel, runtimeCtx: any): Promise<ExecResultOK | ExecResultERR>;
```

- `next` peut être:
  - un index numérique (ex: `0`, `1`, …) pour les `function` (succès),
  - la chaîne `'err'` si et seulement si `catch_error == true` et `authorize_catch_error == true` (branche d’erreur),
  - pour `condition`: un identifiant stable (`_id` de l’item si présent) ou un index.
- Si `next` est omis pour `function`, on utilise par défaut l’index `0`.


## 3) Gestion des erreurs: try/catch et skip

Les options d’instance d’un nœud sont:
- `catch_error` (si le template autorise) → ajoute la sortie `err`.
- `skip_error` (si le template autorise) → ignore les erreurs et continue en succès.

Sémantique d’exécution sur erreur d’un `function`:
- Si `skip_error == true`: ignorer l’erreur et poursuivre via la première sortie de succès (index `0`). Le résultat de l’étape peut être incomplet — consigner un warning.
- Sinon si `catch_error == true`: router via la sortie `err` si une arête est connectée; si aucune arête sur `err`, consigner un warning et poursuivre sans transition (no-op) ou terminer ce chemin selon la politique de la plateforme.
- Sinon (catch/skip désactivés): erreur bloquante → l’exécution du flow s’arrête avec un statut d’échec.

Mutex: `catch_error` et `skip_error` ne peuvent pas être actifs simultanément (invalide).


## 4) Nœuds avec plusieurs sorties (function)

- Sorties déclaratives: `template.output = ["Success", "Retry", ...]` définissent l’ordre et le nombre des sorties de succès.
- Mapping des handles:
  - handle `0` → `template.output[0]`, handle `1` → `template.output[1]`, etc.
  - handle spécial `'err'` disponible uniquement si `catch_error == true` et `template.authorize_catch_error == true`.
- Résolution du prochain nœud:
  1) Récupérer le handle (retourné par l’exécuteur ou implicite `0`).
  2) Chercher l’arête sortante depuis ce handle; s’il n’y en a pas: fin du chemin (non bloquant; consigner un warning).
  3) S’il y a plusieurs arêtes sur le même handle, la recommandation backend est de refuser le flow (bloquant) ou de choisir la première de manière déterministe et consigner un warning.


## 5) Nœud Condition

- `template.output_array_field` (défaut: `items`) désigne le champ de tableau dans le contexte qui définit les branches.
- Chaque item peut contenir:
  - `name`: nom de la branche (affichage/label),
  - `_id`: identifiant stable utilisé pour le handle; s’il est absent, fallback par index (`0..N-1`).
- L’exécuteur renvoie `next`:
  - idéalement l’`_id` de l’item (handle string),
  - sinon un index numérique.
- Résolution: on cherche une arête sortante dont le `sourceHandle` correspond à l’`_id` (ou à l’index). En absence d’arête correspondante: fin de chemin (non bloquant; warning).


## 6) Nœud Loop (recommandations)

- Handles recommandés: `loop_start`, `loop_end`, `end`.
- Stratégie possible:
  - À l’entrée, router vers `loop_start` pour le premier tour.
  - À chaque itération, router vers `loop_end` pour la suite, puis à la condition de sortie vers `end`.
- Le backend peut adapter selon ses besoins; l’important est de conserver des handles stables et valider les arêtes (handles existants).


## 7) Nœuds Start / End

- Start: pas d’entrée, sortie `out` → première transition.
- End: pas de sortie → exécution se termine sur ce chemin.


## 8) Résolution des arêtes et cas limite

- Handle inexistant (edge vers un handle qui n’existe pas pour le type/état du nœud): invalide → bloquant.
- Handle existant mais non connecté: non bloquant → aucun saut; consigner un warning.
- Nœud inaccessible (non atteignable depuis Start): non bloquant → ignorer à l’exécution; consigner un warning.
- Multiples Starts: invalide → bloquant.
- Cycles non supportés (hors `loop`): invalide → bloquant.


## 9) Mise à jour de template (drift)

Avant toute exécution et à chaque modification:
1) Recharger le template courant depuis le catalogue.
2) Recalculer `argsChecksum(template.args)` et le comparer à `NodeModel.templateChecksum`.
3) Recalculer `featureSig(template.authorize_catch_error, template.authorize_skip_error)` et le comparer à `NodeModel.templateFeatureSig`.
4) Si drift (args ou features) → flow invalide tant que le nœud n’est pas synchronisé via une action backend (mise à jour du nœud conservant son `context`).


## 10) Algorithme d’exécution (pseudo-code)

```
function runFlow(flow) {
  validateFlow(flow); // règles bloquantes (voir doc de validation)
  const start = findStartNode(flow);
  const queue = [{ node: start, payload: {} }];
  while (queue.length) {
    const { node, payload } = queue.shift();
    if (node.type === 'end') continue;

    if (node.type === 'condition') {
      const r = await executeNode(node, payload);
      if (!r.ok) return fail(r.error);
      const handle = r.next; // id ou index
      const edge = resolveEdge(node, handle);
      if (edge) queue.push({ node: getNode(edge.target), payload: r.data });
      continue;
    }

    // start/function/loop
    const r = await executeNode(node, payload);
    if (!r.ok) {
      if (node.skip_error === true) {
        const edge = resolveEdge(node, 0); // première sortie succès
        if (edge) queue.push({ node: getNode(edge.target), payload });
        continue;
      }
      if (node.catch_error === true) {
        const edge = resolveEdge(node, 'err');
        if (edge) queue.push({ node: getNode(edge.target), payload: { error: r.error } });
        else warn('err unconnected');
        continue;
      }
      return fail(r.error);
    }

    // succès
    const handle = r.next ?? 0;
    const edge = resolveEdge(node, handle);
    if (edge) queue.push({ node: getNode(edge.target), payload: r.data });
  }
  return success();
}
```


## 11) Résumé des points clés

- Try/Catch/Skip:
  - `skip_error`: ignore l’erreur et sort par la première sortie de succès (0).
  - `catch_error`: redirige sur la branche `err` (si connectée).
  - mutex `catch_error`/`skip_error` et respect des autorisations du template.
- Multi-sorties (function): handles numériques, `err` optionnel; défaut de succès = `0`.
- Condition: handles dynamiques `_id` des items (ou index) → correspondance d’arêtes.
- Start/End/Loop: handles stables; valider les arêtes.
- Arêtes: handle inexistant → bloquant; handle non connecté → warning.
- Drift (args/options) → bloquant tant que non mis à jour (synchronisation du nœud au template courant).

