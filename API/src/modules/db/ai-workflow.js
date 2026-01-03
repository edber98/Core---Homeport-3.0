const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');

module.exports = function(){
  const r = express.Router();
  if (process.env.AI_WORKFLOW_ALLOW_PUBLIC === '1') {
    try { console.warn('[ai-workflow] WARNING: public access enabled (AI_WORKFLOW_ALLOW_PUBLIC=1)'); } catch {}
  } else {
    r.use(authMiddleware());
    r.use(requireCompanyScope());
  }

  r.get('/ai/workflow/stream', async (req, res) => {
    try {
      try { console.log('[ai-workflow][http] incoming SSE', { url: req.originalUrl, hasToken: !!(req.query && (req.query.token||req.query.access_token)), ip: req.ip }); } catch {}
      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.flushHeaders?.();

      const write = (lines) => { try { res.write(lines.join('\n') + '\n\n'); } catch {} };
      const send = (obj) => { try { write([`event: ${obj?.type || 'message'}`, `data: ${JSON.stringify(obj)}`]); } catch (e) { try { console.error('[ai-workflow][sse][send_error]', e?.message||e); } catch {} } };
      const done = () => { try { send({ type: 'done' }); clearInterval(heartbeat); res.end(); console.log('[ai-workflow][http] SSE closed'); } catch {} };
      const heartbeat = setInterval(() => { try { res.write(':keepalive\n\n'); } catch {} }, 15000);

      // Use v2 workflow agent
      let runWorkflowAgentV2;
      try {
        ({ runWorkflowAgentV2 } = require('../../ai/workflow-agent-v2'));
      } catch (e) {
        console.error('[ai-workflow][require_error]', e?.message || e);
        send({ type: 'error', code: 'require_failed', message: String(e?.message || e) });
        return done();
      }
      const q = req.query || {};
      let prompt = String(q.prompt || '');
      const flowId = q.flowId ? String(q.flowId) : null;
      const workspaceId = q.workspaceId ? String(q.workspaceId) : null;
      const action = q.action ? String(q.action) : null;
      
      // Load chat history if provided
      let history = [];
      try {
        const tid = q.threadId ? String(q.threadId) : null;
        if (tid) {
          const AiChatThread = require('../../db/models/ai-chat-thread.model');
          const AiChatMessage = require('../../db/models/ai-chat-message.model');
          const { Types } = require('mongoose');
          let t = Types.ObjectId.isValid(tid) ? await AiChatThread.findById(tid).lean() : await AiChatThread.findOne({ id: tid }).lean();
          if (t) {
            history = await AiChatMessage.find({ threadId: t._id }).sort({ createdAt: 1 }).lean();
            try { console.log('[ai-workflow][history]', { count: history.length, threadId: tid }); } catch {}
            // Ne pas polluer le chat avec l'historique
          }
        }
      } catch (e) { try { console.warn('[ai-workflow][history][error]', e?.message || e); } catch {} }
      
      // Build effective prompt from last user message if prompt is empty
      try {
        if (!prompt || !prompt.trim()) {
          const lastUser = Array.isArray(history) ? history.filter(m => String(m.role||'')==='user').slice(-1)[0] : null;
          if (lastUser) prompt = String(lastUser.text || '') || '';
        }
        console.log('[ai-workflow][prompt]', { hasPrompt: !!prompt, len: prompt ? prompt.length : 0 });
      } catch {}
      try { console.log('[ai-workflow] starting run (v2)'); send({ type: 'message', text: '[ai-workflow] starting' }); } catch {}
      await runWorkflowAgentV2({ prompt, flowId, workspaceId, action, history, send, done });


    } catch (e){ try { res.status(500).json({ success:false, error:'ai_workflow_init_failed', message: String(e?.message || e) }); } catch {} }
  });

  return r;
};
