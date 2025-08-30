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
          // Mirror patches and snapshots into local schema so 'final' contains the built schema
          if (obj && obj.type === 'patch' && Array.isArray(obj.ops)) {
            try { applyPatch(obj.ops); } catch {}
          } else if (obj && obj.type === 'snapshot' && obj.schema && typeof obj.schema === 'object') {
            try { schema = obj.schema; } catch {}
          }
          const payload = JSON.stringify(obj);
          console.log('[ai-form][sse]', obj?.type || 'event', payload.length, 'bytes');
          res.write(`data: ${payload}\n\n`);
        } catch (e) { try { console.error('[ai-form][sse][write_error]', e?.message || e); } catch {} }
      };

      const body = req.body || {};
      const prompt = String(body.prompt || '').trim();
      const provider = (body.provider || '').trim();
      const opts = body.options || {};
      const useSteps = !!opts.steps;
      const layout = (opts.layout === 'horizontal' || opts.layout === 'inline') ? opts.layout : 'vertical';
      const maxFields = Math.max(1, Math.min(200, Number(opts.maxFields) || 20));

      console.log('[ai-form][request]', { provider: provider || 'auto', layout, steps: useSteps, maxFields, promptLen: prompt.length });

      // Maintain server-side schema to send snapshots
      // Initialize with a skeleton so layout/UI is applied immediately with defaults
      let schema = {
        title: (prompt && prompt.length ? `Formulaire — ${prompt.slice(0, 40)}` : 'Formulaire'),
        ui: {
          layout,
          labelAlign: 'left',
          labelsOnTop: layout === 'vertical',
          labelCol: { span: 8 },
          controlCol: { span: 16 },
          widthPx: 1040,
          actions: { showReset: false, showCancel: false },
        },
        summary: { enabled: false, includeHidden: false, dateFormat: 'dd/MM/yyyy' },
        ...(useSteps ? { steps: [] } : { fields: [] })
      };

      const applyPatch = (ops) => {
        // tiny RFC6902 subset (add/replace/remove) with JSON Pointer
        const parsePtr = (p) => String(p || '').replace(/^\//,'').split('/').map(s => s.replace(/~1/g,'/').replace(/~0/g,'~'));
        const get = (obj, parts) => parts.reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
        const ensureParent = (obj, parts, isAdd, lastToken) => {
          let cur = obj;
          for (let i = 0; i < parts.length; i++) {
            const k = parts[i];
            const next = parts[i + 1];
            if (cur[k] == null) {
              // Heuristic: create arrays when next is numeric or '-' or when this key is 'fields' or 'steps'
              const makeArray = (next !== undefined && (next === '-' || String(+next) === next)) || k === 'fields' || k === 'steps' || (isAdd && lastToken === '-');
              cur[k] = makeArray ? [] : {};
            }
            cur = cur[k];
          }
          return cur;
        };
        const set = (obj, pathParts, value, opType) => {
          const last = pathParts[pathParts.length - 1];
          const parent = ensureParent(obj, pathParts.slice(0, -1), opType === 'add', last);
          if (Array.isArray(parent)) {
            if (last === '-') parent.push(value);
            else parent[Number(last)] = value;
          } else parent[last] = value;
        };
        const removeAt = (obj, pathParts) => {
          const last = pathParts[pathParts.length - 1];
          const parent = get(obj, pathParts.slice(0, -1));
          if (parent == null) return;
          if (Array.isArray(parent)) parent.splice(Number(last), 1); else delete parent[last];
        };
        for (const op of ops || []){
          const path = Array.isArray(op.path) ? op.path : parsePtr(String(op.path || ''));
          switch (op.op){
            case 'add': set(schema, path, op.value, 'add'); break;
            case 'replace': set(schema, path, op.value, 'replace'); break;
            case 'remove': removeAt(schema, path); break;
          }
        }
      };

      const emitPatch = (ops) => { applyPatch(ops); send({ type: 'patch', ops }); };
      const emitMessage = (text) => send({ type: 'message', role: 'assistant', text });
      const emitSnapshot = () => send({ type: 'snapshot', schema });

      // Finalizer emits final schema then done
      const done = () => { try { send({ type: 'final', schema }); send({ type: 'done' }); res.end(); } catch {} };

      // Graceful close on client abort
      req.on('close', () => { try { res.end(); } catch {} });

      // Always run LangChain agent (tools-only and plan paths removed)
      {
        try { console.log('[ai-form][agent-langchain][start]'); } catch {}
        try {
          const { runFormAgentWithTools } = require('../../ai/langchain-agent');
          await runFormAgentWithTools({
            prompt,
            history: Array.isArray(body.history) ? body.history : [],
            seedSchema: body.seedSchema && typeof body.seedSchema === 'object' ? body.seedSchema : undefined,
            preferSteps: useSteps,
            layout,
            maxFields,
            send,
            done
          });
          return;
        } catch (e) {
          const msg = String(e?.message || e);
          console.error('[ai-form][agent-langchain][error]', msg);
          send({ type: 'error', code: 'agent_langchain_failed', message: msg });
          emitMessage('Erreur agent LangChain: ' + msg);
        }
      }

      // === Fallback minimal (no autogenerated fields) ===
      emitMessage('Agent indisponible — envoi d’un squelette minimal');
      schema = {
        title: prompt ? `Formulaire — ${prompt.slice(0, 40)}` : 'Formulaire',
        ui: {
          layout,
          labelAlign: 'left',
          labelsOnTop: layout === 'vertical',
          labelCol: { span: 8 },
          controlCol: { span: 16 },
          widthPx: 1040,
          actions: { showReset: false, showCancel: false },
        },
        summary: { enabled: false, includeHidden: false, dateFormat: 'dd/MM/yyyy' },
        ...(useSteps ? { steps: [] } : { fields: [] })
      };
      emitSnapshot();
      done();
    } catch (e) {
      try { res.status(500).json({ success: false, error: 'ai_init_failed', message: String(e?.message || e) }); } catch {}
    }
  });

  // GET (SSE + EventSource): /api/ai/form/build/stream
  // Query params: prompt, provider, agent, layout, steps, maxFields
  r.get('/ai/form/build/stream', async (req, res) => {
    try {
      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();

      const write = (lines) => { try { res.write(lines.join('\n') + '\n\n'); } catch (e) { try { console.error('[ai-form][sse][write_error]', e?.message || e); } catch {} } };
      const send = (obj) => {
        try {
          if (obj && obj.type === 'patch' && Array.isArray(obj.ops)) {
            try { applyPatch(obj.ops); } catch {}
          } else if (obj && obj.type === 'snapshot' && obj.schema && typeof obj.schema === 'object') {
            try { schema = obj.schema; } catch {}
          }
          const payload = JSON.stringify(obj);
          console.log('[ai-form][sse]', obj?.type || 'event', payload.length, 'bytes');
          write([`event: ${obj?.type || 'message'}`, `data: ${payload}`]);
        } catch (e) { try { console.error('[ai-form][sse][write_error]', e?.message || e); } catch {} }
      };
      // Finalizer emits final schema then done
      const done = () => { try { send({ type: 'final', schema }); send({ type: 'done' }); clearInterval(heartbeat); res.end(); } catch {} };

      // Heartbeat to keep proxies happy
      const heartbeat = setInterval(() => { try { res.write(':keepalive\n\n'); } catch {} }, 15000);

      const q = req.query || {};
      const prompt = String(q.prompt || '').trim();
      const provider = String(q.provider || '').trim();
      const agent = String(q.agent || '').trim();
      const layout = (q.layout === 'horizontal' || q.layout === 'inline') ? q.layout : 'vertical';
      const useSteps = String(q.steps || '').toLowerCase() === 'true';
      const maxFields = Math.max(1, Math.min(200, Number(q.maxFields) || 20));
      // Optional seed schema via base64 JSON in query param 'seed'
      let seedSchema = undefined;
      try {
        const seedRaw = q.seed ? String(q.seed) : '';
        if (seedRaw) {
          const json = Buffer.from(seedRaw, 'base64').toString('utf8');
          const obj = JSON.parse(json);
          if (obj && typeof obj === 'object') seedSchema = obj;
        }
      } catch {}

      console.log('[ai-form][request][GET]', { provider: provider || 'auto', layout, steps: useSteps, maxFields, promptLen: prompt.length, agent: agent || 'auto' });

      // Maintain server-side schema to send snapshots
      // Initialize with a skeleton or provided seed so layout/UI is effective by default
      let schema = seedSchema && typeof seedSchema === 'object'
        ? (function ensureLayout(s){
            try {
              if (!s.ui || typeof s.ui !== 'object') s.ui = {};
              if (!s.ui.layout) s.ui.layout = layout;
              if (s.ui.labelAlign == null) s.ui.labelAlign = 'left';
              if (s.ui.labelsOnTop == null) s.ui.labelsOnTop = (layout === 'vertical');
              if (!s.ui.labelCol) s.ui.labelCol = { span: 8 };
              if (!s.ui.controlCol) s.ui.controlCol = { span: 16 };
              if (s.ui.widthPx == null) s.ui.widthPx = 1040;
              if (!s.ui.actions) s.ui.actions = { showReset: false, showCancel: false };
              if (!s.summary) s.summary = { enabled: false, includeHidden: false, dateFormat: 'dd/MM/yyyy' };
              if (!s.fields && !s.steps) s.fields = [];
            } catch {}
            return s;
          })(JSON.parse(JSON.stringify(seedSchema)))
        : {
            title: (prompt && prompt.length ? `Formulaire — ${prompt.slice(0, 40)}` : 'Formulaire'),
            ui: {
              layout,
              labelAlign: 'left',
              labelsOnTop: layout === 'vertical',
              labelCol: { span: 8 },
              controlCol: { span: 16 },
              widthPx: 1040,
              actions: { showReset: false, showCancel: false },
            },
            summary: { enabled: false, includeHidden: false, dateFormat: 'dd/MM/yyyy' },
            ...(useSteps ? { steps: [] } : { fields: [] })
          };

      const applyPatch = (ops) => {
        const parsePtr = (p) => String(p || '').replace(/^\//,'').split('/').map(s => s.replace(/~1/g,'/').replace(/~0/g,'~'));
        const get = (obj, parts) => parts.reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
        const ensureParent = (obj, parts, isAdd, lastToken) => {
          let cur = obj;
          for (let i = 0; i < parts.length; i++) {
            const k = parts[i];
            const next = parts[i + 1];
            if (cur[k] == null) {
              const makeArray = (next !== undefined && (next === '-' || String(+next) === next)) || k === 'fields' || k === 'steps' || (isAdd && lastToken === '-');
              cur[k] = makeArray ? [] : {};
            }
            cur = cur[k];
          }
          return cur;
        };
        const set = (obj, pathParts, value, opType) => {
          const last = pathParts[pathParts.length - 1];
          const parent = ensureParent(obj, pathParts.slice(0, -1), opType === 'add', last);
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
        for (const op of ops || []){
          const path = Array.isArray(op.path) ? op.path : parsePtr(String(op.path || ''));
          switch (op.op){
            case 'add': set(schema, path, op.value, 'add'); break;
            case 'replace': set(schema, path, op.value, 'replace'); break;
            case 'remove': removeAt(schema, path); break;
          }
        }
      };

      const emitPatch = (ops) => { applyPatch(ops); send({ type: 'patch', ops }); };
      const emitMessage = (text) => send({ type: 'message', role: 'assistant', text });
      const emitSnapshot = () => send({ type: 'snapshot', schema });

      // Close on client abort
      req.on('close', () => { try { clearInterval(heartbeat); res.end(); } catch {} });

      // Always run LangChain agent
      {
        try { console.log('[ai-form][agent-langchain][start][GET]'); } catch {}
        try {
          const { runFormAgentWithTools } = require('../../ai/langchain-agent');
          await runFormAgentWithTools({ prompt, history: [], seedSchema, preferSteps: useSteps, layout, maxFields, send, done });
          return;
        } catch (e) {
          const msg = String(e?.message || e);
          console.error('[ai-form][agent-langchain][error][GET]', msg);
          send({ type: 'error', code: 'agent_langchain_failed', message: msg });
          emitMessage('Erreur agent LangChain: ' + msg);
        }
      }

      // Fallback minimal
      emitMessage('Agent indisponible — envoi d’un squelette minimal');
      schema = {
        title: prompt ? `Formulaire — ${prompt.slice(0, 40)}` : 'Formulaire',
        ui: {
          layout,
          labelAlign: 'left',
          labelsOnTop: layout === 'vertical',
          labelCol: { span: 8 },
          controlCol: { span: 16 },
          widthPx: 1040,
          actions: { showReset: false, showCancel: false },
        },
        summary: { enabled: false, includeHidden: false, dateFormat: 'dd/MM/yyyy' },
        ...(useSteps ? { steps: [] } : { fields: [] })
      };
      emitSnapshot();
      done();
    } catch (e) {
      try { res.status(500).json({ success: false, error: 'ai_get_failed', message: String(e?.message || e) }); } catch {}
    }
  });

  return r;
}
