# Flow — Persistance, Versioning, Intégrité & Conciliation

Ce document formalise la structure de persistance, les invariants de données et l’algorithme de conciliation des edges, notamment pour les nœuds de type condition.

## 1. Objets Persistés

- FlowDefinition (brouillon, éditable): `{ id, orgId, projectId, name, nodes[], edges[], status:'draft|archived', createdAt, updatedAt }`
- FlowVersion (snapshot immuable): `{ id, flowId, schemaVersion, definitionHash, nodes[], edges[], publishedAt, note? }`
- FlowExecution (historique): `{ id, flowVersionId, status, startedAt, finishedAt, state, outputs?, logs? }`

## 2. Invariants

- IDs uniques: `node.id`, `edge.id` (UUID).
- `edge.source.nodeId` et `edge.target.nodeId` existent dans le même flow.
- `edge.source.outputId` appartient aux sorties du nœud source.
- Condition: `items[i]._id` stables tant que l’item existe. Les renommages/réordonnancements ne modifient pas `_id`.

## 3. Publication & Hash

- `publish` crée une `FlowVersion` avec `schemaVersion` et un `definitionHash` (sha256 de la représentation normalisée).
- Aucune mutation d’une version publiée.

## 4. Concurrence Optimiste

- `ETag` sur `FlowDefinition`; `If-Match` exigé au `PUT /flows/:id`.
- Réponse `409 Conflict` en cas de mismatch.

## 5. Conciliation des Edges (Condition Nodes)

Objectif: conserver les edges existants lors des modifications tant que les handles (items `_id`) persistent; supprimer uniquement ceux pointant vers des handles supprimés.

Entrées:
- `prevDef: FlowDefinition` (état en base avant update)
- `nextDef: FlowDefinition` (payload reçu)

Sortie:
- `reconciledEdges: FlowEdge[]`

Algorithme:
```ts
function reconcileEdges(prevDef: FlowDefinition, nextDef: FlowDefinition): FlowEdge[] {
  const nodeByIdPrev = indexBy(prevDef.nodes, n => n.id);
  const nodeByIdNext = indexBy(nextDef.nodes, n => n.id);

  return nextDef.edges.filter(e => {
    // valider existence des nœuds
    if (!nodeByIdNext[e.source.nodeId] || !nodeByIdNext[e.target.nodeId]) return false;

    const srcNext = nodeByIdNext[e.source.nodeId];
    if (srcNext.kind === 'condition') {
      const allowed = new Set<string>();
      for (const it of srcNext.items ?? []) allowed.add(it._id);
      if (srcNext.else?._id) allowed.add(srcNext.else._id);
      return allowed.has(e.source.outputId);
    }

    // pour les autres nœuds, vérifier les sorties connues (template/contrat)
    const outputs = computeOutputs(srcNext); // ex.: ['ok'] + ['err' si catch]
    return outputs.includes(e.source.outputId);
  });
}
```

Notes:
- Les edges explicitement supprimés par l’utilisateur peuvent être traités via une liste `allowedRemovedEdgeIds` côté UI et honorée par l’API.
- Un réordonnancement de `items` n’impacte pas `source.outputId` donc l’edge est conservé.

## 6. Validation au PUT

- Rejeter si un edge référence un handle inexistant (après conciliation).
- Rejeter si un templateKey inconnu est utilisé.
- Rejeter si `settings.catch_error=true` alors que `authorize_catch_error=false` pour le template.

## 7. Migration de Schéma

- Chaque `FlowVersion` porte `schemaVersion`.
- Introduire des «adapters» (lecteurs) pour charger d’anciennes versions et les projeter dans le modèle courant sans muter les versions publiées.

