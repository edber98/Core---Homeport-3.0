# Flow — Exécution: État, Planification, Sélection d’edges, Erreurs

Ce document formalise le moteur d’exécution des flows, indépendant de l’implémentation concrète.

## 1. États & Cycle de Vie

- Execution.status: `idle` → `running` → `succeeded | failed`.
- NodeState: `pending` → `ok | error | failed | skipped`.
- Un nœud est «activé» lorsque l’un de ses inputs reçoit un message (payload).

## 2. Modèle de Message

- Message = `{ payload: any, meta?: { fromNodeId?: UUID, outputId?: string, time: ISO } }`.
- Les messages circulent le long des edges dans l’ordre d’émission.

## 3. Orchestrateur (file & scheduling)

Pseudo-code séquentiel (peut être parallélisé):

```ts
const queue: Array<{ nodeId: UUID; msg: Message }>; // FIFO

while (queue.length) {
  const { nodeId, msg } = queue.shift()!;
  const node = getNode(flow, nodeId);
  try {
    const { outputs, side } = await executeNode(node, msg);
    mark(nodeId, 'ok', side);
    for (const [outputId, outMsg] of outputs) {
      for (const e of edgesFrom(flow, nodeId, outputId)) {
        queue.push({ nodeId: e.target.nodeId, msg: outMsg });
      }
    }
  } catch (err) {
    if (isFunction(node) && canCatch(node)) {
      mark(nodeId, 'error', serialize(err));
      for (const e of edgesFrom(flow, nodeId, 'err')) queue.push({ nodeId: e.target.nodeId, msg });
    } else {
      mark(nodeId, 'failed', serialize(err));
      break; // exécution échoue
    }
  }
}
```

Notes:
- `canCatch(node) = node.authorize_catch_error && node.settings?.catch_error === true`.
- Implémentations concurrentes doivent garantir l’ordre par nœud ou utiliser un `concurrencyKey`.

## 4. Exécution des Nœuds (contrats)

Signature:
```ts
type Handler = (input: Message, params: any, ctx: RuntimeContext) => Promise<{
  outputs: Iterable<[outputId: string, msg: Message]>,
  side?: any // info diagnostique optionnelle
}>;
```

Obligations des handlers:
- Totalement déterministes pour un même `input, params, ctx.now`.
- Temps max respecté (`timeoutMs`), abortable via `AbortSignal`.
- Ne jettent que des erreurs sérialisables (`{ name, message, stack? }`).

## 5. Nœuds Spéciaux

### 5.1. Trigger
- Émet un premier message `ok` sans entrée. Le backend choisit la source (HTTP, schedule, event bus).

### 5.2. Condition
- Reçoit `input.payload` et évalue chaque `items[i].expression` dans le contexte `{ input: payload, ctx, env, now }`.
- Modes:
  - `firstMatch`: première expression vraie → une seule sortie; sinon `else`.
  - `allMatches`: toutes les expressions vraies → sorties multiples; sinon `else`.
  - `elseOnlyIfNoMatch`: comme `firstMatch` mais aucune sortie si au moins une match.
- Le message relayé est identique à l’entrée (sauf ajout meta `matchedItemId`).

### 5.3. Merge
- `race`: la première entrée émet; les autres entrées sont ignorées pour ce cycle.
- `join`: attend tous les inputs; l’ordre est défini par l’ordre de déclaration des entrées.
- `concat`: propage chaque message séquentiellement.

## 6. Timeouts & Retry

- `timeoutMs`: annule le handler; si `catch_error` actif → `err`; sinon `failed`.
- `retry`: applique une politique de retries avant d’émettre `err`.
  - Backoff linéaire/exponentiel selon `backoffMs`.
  - Les retries doivent être idempotents (voir `idempotencyKey`).

## 7. Idempotence & Concurrence

- `idempotencyKey`: deux exécutions portant la même clé retournent le même résultat et ne relancent pas l’appel externe.
- `concurrencyKey`: sériel par clé; un seul handler actif par clé.

## 8. Traces & Observabilité

- Chaque nœud émet une trace `{ nodeId, start, end, durationMs, inputSize, outputSize, error? }`.
- Corrélation globale via `executionId`.

## 9. Contrats d’Erreur

- Erreur de handler → branche `err` si activée, payload: `{ error, input, params? }`.
- Erreur fatale (pas de `err`) → `Execution.failed`.

## 10. Cas Limites

- Boucles/cycles: non supportées par défaut; si supportées, limiter par compteur d’itérations.
- Graphes massifs: définir un budget (p.ex. 5000 nœuds, 20000 edges) et refuser au `publish`.

