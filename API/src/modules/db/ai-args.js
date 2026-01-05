const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  r.get('/ai/args/stream', async (req, res) => {
    try {
      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.flushHeaders?.();
      const write = (lines) => { try { res.write(lines.join('\n') + '\n\n'); } catch {} };
      const send = (obj) => { try { write([`event: ${obj?.type || 'message'}`, `data: ${JSON.stringify(obj)}`]); } catch (e) { try { console.error('[ai-args][sse][send_error]', e?.message||e); } catch {} } };
      const done = () => { try { send({ type: 'done' }); clearInterval(heartbeat); res.end(); } catch {} };
      const heartbeat = setInterval(() => { try { res.write(':keepalive\n\n'); } catch {} }, 15000);

      const { runArgsAgentWithTools } = require('../../ai/args-agent');
      const q = req.query || {};
      const flowId = q.flowId ? String(q.flowId) : null;
      const nodeId = q.nodeId ? String(q.nodeId) : null;
      const branch = q.branch ? String(q.branch) : null;
      const threadId = q.threadId ? String(q.threadId) : null;
      try { console.info('[ai-args][sse] req', { flowId, nodeId, branch, threadId }); } catch {}
      if (!flowId || !nodeId) { send({ type:'error', code:'bad_request', message:'Missing flowId or nodeId' }); return done(); }

      // Optional: load chat history for this thread
      let history = [];
      try {
        if (threadId) {
          const AiChatThread = require('../../db/models/ai-chat-thread.model');
          const AiChatMessage = require('../../db/models/ai-chat-message.model');
          const { Types } = require('mongoose');
          let thr = Types.ObjectId.isValid(threadId) ? await AiChatThread.findById(threadId).lean() : await AiChatThread.findOne({ id: threadId }).lean();
          if (thr) {
            const msgs = await AiChatMessage.find({ threadId: thr._id }).sort({ createdAt: 1 }).lean();
            history = (msgs || []).map(m => ({ role: m.role || 'user', content: (m.text != null ? String(m.text) : (Array.isArray(m.parts) ? JSON.stringify(m.parts) : '')) }));
          }
        }
      } catch (e) { try { console.warn('[ai-args][history][error]', e?.message || e); } catch {} }
      try { console.info('[ai-args][sse] history_loaded', { count: Array.isArray(history) ? history.length : 0 }); } catch {}

      // Build effective prompt
      let prompt = String(q.prompt || '').trim();
      try {
        if (!prompt) {
          const lastUser = Array.isArray(history) ? history.filter(m => String(m.role||'')==='user').slice(-1)[0] : null;
          prompt = lastUser ? String(lastUser.content || '') : '';
        }
      } catch {}

      try { console.info('[ai-args][sse] prompt_ready', { len: (String(prompt||'').length||0) }); } catch {}
      await runArgsAgentWithTools({ prompt, flowId, nodeId, branch, history, send, done });
    } catch (e) {
      try { console.error('[ai-args][sse][fatal]', e?.stack || e?.message || e); } catch {}
      try { res.status(500).json({ success:false, error:'ai_args_init_failed', message: String(e?.message || e) }); } catch {}
    }
  });

  return r;
};
