# Modèle d’Erreurs — API & Runtime Flows

Ce document standardise les erreurs côté API (REST) et côté runtime d’exécution des flows.

## 1. API REST — Problem Details

Format recommandé (RFC 7807):
```json
{
  "type": "https://docs.example.com/errors/validation",
  "title": "ValidationError",
  "status": 400,
  "detail": "edge.source.outputId not found on node n-cond",
  "instance": "/api/v1/flows/123",
  "errors": [ { "path": ["edges", 3, "source", "outputId"], "message": "unknown handle" } ]
}
```

Codes usuels: `400`, `401`, `403`, `404`, `409`, `422`, `500`.

## 2. Runtime Flows — Classification

- `HandlerError`: erreur levée par un nœud fonction (attrapable si `err` activé).
- `TimeoutError`: délai dépassé (peut être attrapé en `err`).
- `RetryExhausted`: échecs successifs après retries (peut aller en `err`).
- `FatalGraphError`: erreur structurelle (ex.: handle introuvable) → échec d’exécution.

Sérialisation commune:
```json
{ "name": "TimeoutError", "message": "Exceeded 5000ms", "nodeId": "n1", "stack": "..." }
```

## 3. Payload de la branche err

```json
{
  "error": {"name":"HandlerError","message":"ECONNRESET"},
  "input": {"payload": {"userId": 1}},
  "params": {"url": "https://api"},
  "meta": {"attempt": 3}
}
```

## 4. Traces & Corrélation

- Chaque log inclut `executionId`, `nodeId`, `templateKey`, `spanId?`.
- Les erreurs contiennent la même corrélation pour une analyse facile.

