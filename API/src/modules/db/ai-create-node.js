const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  async function handleStream(req, res){
    try {
      try { console.info('[ai-create-node][sse] incoming', { url: req.originalUrl, ip: req.ip, ua: req.headers['user-agent'] }); } catch {}
      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.flushHeaders?.();
      const write = (lines) => { try { res.write(lines.join('\n') + '\n\n'); } catch {} };
      const send = (obj) => { try { write([`event: ${obj?.type || 'message'}`, `data: ${JSON.stringify(obj)}`]); } catch (e) { try { console.error('[ai-create-node][sse][send_error]', e?.message||e); } catch {} } };
      const done = () => { try { send({ type: 'done' }); clearInterval(heartbeat); res.end(); } catch {} };
      const heartbeat = setInterval(() => { try { res.write(':keepalive\n\n'); } catch {} }, 15000);

      const { runCreateNodeAgent } = require('../../ai/create-node-agent');
      const q = req.query || {};
      const prompt = String(q.prompt || '');
      const seedB64 = String(q.seed || '');
      let seedGraph = null;
      try {
        if (seedB64) {
          const json = Buffer.from(seedB64, 'base64').toString('utf8');
          seedGraph = JSON.parse(json);
        }
      } catch (e) {
        try { console.warn('[ai-create-node][sse] seed_decode_failed', e?.message || e); } catch {}
      }
      const sourceId = q.sourceId ? String(q.sourceId) : null;
      const sourceHandle = q.sourceHandle ? String(q.sourceHandle) : null;
      const threadId = q.threadId ? String(q.threadId) : null;
      const flowId = q.flowId ? String(q.flowId) : null;
      try { console.info('[ai-create-node][sse] req', { hasPrompt: !!prompt, hasSeed: !!seedGraph, sourceId, sourceHandle, flowId, threadId }); } catch {}
      if (!prompt || !seedGraph || !sourceId) { send({ type:'error', code:'bad_request', message:'Missing prompt, seedGraph or sourceId' }); return done(); }
      let history = [];
      try {
        if (threadId) {
          const AiChatThread = require('../../db/models/ai-chat-thread.model');
          const AiChatMessage = require('../../db/models/ai-chat-message.model');
          const { Types } = require('mongoose');
          let thr = Types.ObjectId.isValid(threadId) ? await AiChatThread.findById(threadId).lean() : await AiChatThread.findOne({ id: threadId }).lean();
          if (thr) {
            const msgs = await AiChatMessage.find({ threadId: thr._id }).sort({ createdAt: 1 }).lean();
            const total = Array.isArray(msgs) ? msgs.length : 0;
            const used = total > 50 ? msgs.slice(total - 50) : (msgs || []);
            history = (used || []).map(m => ({ role: m.role || 'user', content: (m.text != null ? String(m.text) : (Array.isArray(m.parts) ? JSON.stringify(m.parts) : '')) }));
            try { console.info('[ai-create-node][history]', { total, used: history.length }); } catch {}
          }
        }
      } catch (e) { try { console.warn('[ai-create-node][history][error]', e?.message || e); } catch {} }

      await runCreateNodeAgent({ prompt, seedGraph, sourceId, sourceHandle, flowId, history, send, done });
      try { console.info('[ai-create-node][sse] finished'); } catch {}
    } catch (e) { try { console.error('[ai-create-node][sse][fatal]', e?.stack || e?.message || e); res.status(500).json({ success:false, error:'ai_create_node_init_failed', message: String(e?.message || e) }); } catch {} }
  }

  r.get('/ai/create-node/stream', handleStream);
  // Alias path to avoid potential client blockers on "create-node"
  r.get('/ai/node-create/stream', handleStream);

  return r;
};
