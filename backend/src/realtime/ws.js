const WebSocket = (() => { try { return require('ws'); } catch { return null; } })();
const listeners = new Map(); // runId -> Set<socket>

function attach(server){
  if (!WebSocket) return null;
  const wss = new WebSocket.Server({ server, path: '/ws' });
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const runId = url.searchParams.get('runId');
    if (runId){
      if (!listeners.has(runId)) listeners.set(runId, new Set());
      listeners.get(runId).add(ws);
      ws.on('close', () => { listeners.get(runId)?.delete(ws); });
    }
  });
  return wss;
}

function broadcast(runId, event){
  const set = listeners.get(runId); if (!set) return;
  for (const ws of set){ try { ws.send(JSON.stringify(event)); } catch {} }
}

module.exports = { attach, broadcast };

