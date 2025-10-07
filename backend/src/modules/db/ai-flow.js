const express = require('express');

const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');

module.exports = function(){
  const r = express.Router();
  if (process.env.AI_FLOW_ALLOW_PUBLIC === '1') {
    try { console.warn('[ai-flow] WARNING: public access enabled (AI_FLOW_ALLOW_PUBLIC=1)'); } catch {}
  } else {
    r.use(authMiddleware());
    r.use(requireCompanyScope());
  }
  // GET (SSE + EventSource): /api/ai/flow/build/stream
  r.get('/ai/flow/build/stream', async (req, res) => {
    try {
      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();

      const write = (lines) => { try { res.write(lines.join('\n') + '\n\n'); } catch (e) { try { console.error('[ai-flow][sse][write_error]', e?.message || e); } catch {} } };
      const send = (obj) => {
        try {
          if (obj && obj.type === 'patch' && Array.isArray(obj.ops)) {
            try { applyPatch(obj.ops); } catch {}
          } else if (obj && obj.type === 'snapshot' && obj.graph && typeof obj.graph === 'object') {
            try { graph = obj.graph; } catch {}
          }
          const payload = JSON.stringify(obj);
          write([`event: ${obj?.type || 'message'}`, `data: ${payload}`]);
        } catch (e) { try { console.error('[ai-flow][sse][write_error]', e?.message || e); } catch {} }
      };
      const done = () => { try { send({ type: 'final', graph }); send({ type: 'done' }); clearInterval(heartbeat); res.end(); } catch {} };
      const heartbeat = setInterval(() => { try { res.write(':keepalive\n\n'); } catch {} }, 15000);

      const q = req.query || {};
      const prompt = String(q.prompt || '').trim();
      const workspaceId = q.workspaceId ? String(q.workspaceId) : null;
      let seedGraph = undefined;
      try {
        const seedRaw = q.seed ? String(q.seed) : '';
        if (seedRaw) {
          const json = Buffer.from(seedRaw, 'base64').toString('utf8');
          const obj = JSON.parse(json);
          if (obj && typeof obj === 'object') seedGraph = obj;
        }
      } catch {}

      let graph = seedGraph && typeof seedGraph === 'object' ? seedGraph : { nodes: [], edges: [] };

      const applyPatch = (ops) => {
        const parsePtr = (p) => String(p || '').replace(/^\//,'').split('/').map(s => s.replace(/~1/g,'/').replace(/~0/g,'~'));
        const get = (obj, parts) => parts.reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
        const ensureParent = (obj, parts, isAdd, lastToken) => {
          let cur = obj;
          for (let i = 0; i < parts.length; i++) {
            const k = parts[i]; const next = parts[i+1];
            if (cur[k] == null) { const makeArray = (next !== undefined && (next==='-' || String(+next)===next)) || (k==='nodes') || (k==='edges') || (isAdd && lastToken==='-'); cur[k] = makeArray ? [] : {}; }
            cur = cur[k];
          }
          return cur;
        };
        const set = (obj, pathParts, value, opType) => {
          const last = pathParts[pathParts.length - 1];
          const parent = ensureParent(obj, pathParts.slice(0, -1), opType === 'add', last);
          if (Array.isArray(parent)) { if (last === '-') parent.push(value); else parent[Number(last)] = value; } else parent[last] = value;
        };
        const removeAt = (obj, pathParts) => { const last = pathParts[pathParts.length - 1]; const parent = get(obj, pathParts.slice(0, -1)); if (parent == null) return; if (Array.isArray(parent)) parent.splice(Number(last), 1); else delete parent[last]; };
        for (const op of ops || []){
          const path = Array.isArray(op.path) ? op.path : parsePtr(String(op.path || ''));
          switch (op.op){ case 'add': set(graph, path, op.value, 'add'); break; case 'replace': set(graph, path, op.value, 'replace'); break; case 'remove': removeAt(graph, path); break; }
        }
      };

      try {
        const { runFlowAgentWithTools } = require('../../ai/flow-agent');
        await runFlowAgentWithTools({ prompt, history: [], seedGraph, workspaceId, send, done });
        return;
      } catch (e) {
        const msg = String(e?.message || e);
        console.error('[ai-flow][agent][error]', msg);
        send({ type: 'error', code: 'agent_failed', message: msg });
      }

      // Fallback minimal snapshot
      send({ type: 'snapshot', graph });
      done();
    } catch (e) {
      try { res.status(500).json({ success: false, error: 'ai_flow_init_failed', message: String(e?.message || e) }); } catch {}
    }
  });

  return r;
}
