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
      ws.on('close', () => {
        const set = listeners.get(runId);
        if (set) {
          set.delete(ws);
          // Clean up empty entries to prevent unbounded Map growth
          if (set.size === 0) listeners.delete(runId);
        }
      });
    }
  });
  return wss;
}

function broadcast(runId, event){
  const set = listeners.get(runId); if (!set) return;
  const data = JSON.stringify(event);
  for (const ws of set){ try { ws.send(data); } catch {} }
}

// Clean up all listeners for a completed run
function cleanup(runId) {
  const set = listeners.get(runId);
  if (set) {
    for (const ws of set) { try { ws.close(); } catch {} }
    listeners.delete(runId);
  }
}

module.exports = { attach, broadcast, cleanup };
