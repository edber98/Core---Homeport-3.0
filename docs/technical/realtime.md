Realtime API (SSE + Socket.IO)

Overview
- The backend emits run progress events via SSE and Socket.IO so the frontend can reflect live execution (per-node input/argsPre/argsPost/result).

SSE
- Endpoint: GET /api/runs/{runId}/stream
- Events: run.started, node.done, node.skipped, run.completed, run.failed, heartbeat
- Payload: JSON with at least { ts, type, ... } and for node.done { nodeId, input, argsPre, argsPost, result }

Socket.IO
- Connect: io('http://localhost:5055', { transports: ['websocket'] })
- Subscribe to a run: socket.emit('subscribe:run', { runId })
- Events:
  - 'run:event' — same payloads as SSE (run.started/node.done/...)
- Unsubscribe: socket.emit('unsubscribe:run', { runId })
- Server rooms: "run:{runId}"; backend broadcasts events into those rooms

Usage Notes
- Use SSE for simple consumption without extra libs; use Socket.IO (WS) if you need bi-directional features or mobile stability.
- Both channels are emitted simultaneously; choose one in the client.

