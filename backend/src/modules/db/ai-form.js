const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');

module.exports = function(){
  const r = express.Router();
  if (process.env.AI_FORM_ALLOW_PUBLIC === '1') {
    try { console.warn('[ai-form] WARNING: public access enabled (AI_FORM_ALLOW_PUBLIC=1)'); } catch {}
  } else {
    r.use(authMiddleware());
    r.use(requireCompanyScope());
  }

  // POST (SSE): /api/ai/form/build
  r.post('/ai/form/build', async (req, res) => {
    try {
      // SSE headers
      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // disable buffering on proxies like Nginx
      res.flushHeaders?.();

      const send = (obj) => {
        try {
          const payload = JSON.stringify(obj);
          console.log('[ai-form][sse]', obj?.type || 'event', payload.length, 'bytes');
          res.write(`data: ${payload}\n\n`);
        } catch (e) { try { console.error('[ai-form][sse][write_error]', e?.message || e); } catch {} }
      };
      const done = () => { try { send({ type: 'done' }); res.end(); } catch {} };

      const body = req.body || {};
      const prompt = String(body.prompt || '').trim();
      const provider = (body.provider || '').trim();
      const opts = body.options || {};
      const useSteps = !!opts.steps;
      const layout = (opts.layout === 'horizontal' || opts.layout === 'inline') ? opts.layout : 'vertical';
      const maxFields = Math.max(1, Math.min(200, Number(opts.maxFields) || 20));

      console.log('[ai-form][request]', { provider: provider || 'auto', layout, steps: useSteps, maxFields, promptLen: prompt.length });

      // Maintain server-side schema to send snapshots
      let schema = {};

      const applyPatch = (ops) => {
        // tiny RFC6902 subset (add/replace/remove) with JSON Pointer
        const get = (obj, pathParts) => pathParts.reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
        const set = (obj, pathParts, value) => {
          const last = pathParts[pathParts.length - 1];
          const parent = pathParts.slice(0, -1).reduce((acc, k) => (acc[k] == null ? (acc[k] = (isFinite(+k) ? [] : {})) : acc[k]), obj);
          if (Array.isArray(parent)) {
            if (last === '-') parent.push(value); else parent[Number(last)] = value;
          } else parent[last] = value;
        };
        const removeAt = (obj, pathParts) => {
          const last = pathParts[pathParts.length - 1];
          const parent = get(obj, pathParts.slice(0, -1));
          if (parent == null) return;
          if (Array.isArray(parent)) parent.splice(Number(last), 1); else delete parent[last];
        };
        const parsePtr = (p) => p.replace(/^\//,'').split('/').map(s => s.replace(/~1/g,'/').replace(/~0/g,'~'));
        for (const op of ops || []){
          const path = Array.isArray(op.path) ? op.path : parsePtr(String(op.path || ''));
          switch (op.op){
            case 'add': set(schema, path, op.value); break;
            case 'replace': set(schema, path, op.value); break;
            case 'remove': removeAt(schema, path); break;
          }
        }
      };

      const emitPatch = (ops) => { applyPatch(ops); send({ type: 'patch', ops }); };
      const emitMessage = (text) => send({ type: 'message', role: 'assistant', text });
      const emitSnapshot = () => send({ type: 'snapshot', schema });

      // Graceful close on client abort
      req.on('close', () => { try { res.end(); } catch {} });

      const useOpenAI = provider === 'openai' || !!process.env.OPENAI_API_KEY || !!process.env.OPENAI_KEY || !!process.env.OPENAI_APIKEY;
      if (useOpenAI) {
        emitMessage('Analyse de la demande avec le modèle…');
        try {
          const { generatePlanAndSchema } = require('../../ai/openai');
          const out = await generatePlanAndSchema({ prompt });
          const steps = Array.isArray(out.steps) ? out.steps : [];
          if (out.commentary) emitMessage(String(out.commentary));
          // Stream plan as messages
          for (const s of steps) emitMessage(`• ${String(s)}`);
          if (process.env.AI_FORM_FORWARD_RAW === '1' && out && typeof out._raw === 'string') {
            emitMessage('[RAW]\n' + String(out._raw).slice(0, 1000));
          }
          let target = (out && out.schema && typeof out.schema === 'object') ? out.schema : {};
          if (!target || typeof target !== 'object' || (!Array.isArray(target.fields) && !Array.isArray(target.steps))) {
            console.warn('[ai-form][warn] missing schema.fields/steps in provider output; falling back to entire object');
            if (out && typeof out === 'object' && (Array.isArray(out.fields) || Array.isArray(out.steps))) target = out;
          }
          if (!target || typeof target !== 'object' || (!Array.isArray(target.fields) && !Array.isArray(target.steps))) {
            console.error('[ai-form][error] provider returned no usable schema');
            emitMessage('Le modèle n\'a pas renvoyé de schéma exploitable.');
          }
          // Emit one authoritative snapshot (agent chooses all fields; no defaults added here)
          schema = target;
          emitSnapshot();
          done();
          return;
        } catch (e) {
          console.error('[ai-form][openai][error]', e?.message || e);
          send({ type: 'error', code: 'openai_unavailable', message: String(e && e.message || e) });
          emitMessage('Provider OpenAI indisponible, bascule sur heuristique.');
        }
      }

      // === Fallback heuristic stub: minimal, no default fields (agent-only responsibility) ===
      emitMessage('Agent indisponible — envoi d’un squelette minimal');
      schema = { title: prompt ? `Formulaire — ${prompt.slice(0, 40)}` : 'Formulaire', ui: { layout, labelsOnTop: layout === 'vertical' }, ...(useSteps ? { steps: [] } : { fields: [] }) };
      emitSnapshot();
      done();
    } catch (e) {
      try { res.status(500).json({ success: false, error: 'ai_init_failed', message: String(e?.message || e) }); } catch {}
    }
  });

  return r;
}
