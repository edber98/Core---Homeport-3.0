// Handlers pour les nodes AI Assistant du plugin Kinn.
// Couvre threads + messages + streaming SSE comme openai_chat_completion.

const { buildKinnClient, ok, fail } = require('./_helpers');

module.exports = {
  // ── Threads CRUD ───────────────────────────────────────────────────────
  async kinn_ai_list_threads(node, msg, inputs, opts) {
    try {
      const c = buildKinnClient(opts);
      const wsId = c.resolveWorkspaceId(inputs);
      if (!wsId) return fail('workspaceId requis');
      const params = new URLSearchParams({ workspaceId: wsId });
      if (inputs.mode) params.set('mode', String(inputs.mode));
      if (inputs.flowId) params.set('flowId', String(inputs.flowId));
      if (inputs.formId) params.set('formId', String(inputs.formId));
      const limit = Math.min(parseInt(inputs.limit || 50, 10), 200);
      params.set('limit', String(limit));
      const res = await c.fetchKinn(`/api/ai/threads?${params.toString()}`);
      const threads = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      return ok({ threads, count: threads.length });
    } catch (e) { return fail(e); }
  },

  async kinn_ai_create_thread(node, msg, inputs, opts) {
    try {
      const c = buildKinnClient(opts);
      const wsId = c.resolveWorkspaceId(inputs);
      if (!wsId) return fail('workspaceId requis');
      const body = {
        mode: String(inputs.mode || 'chat'),
        title: String(inputs.title || 'Chat'),
      };
      if (inputs.agentId) body.agentId = String(inputs.agentId);
      if (inputs.flowId) body.flowId = String(inputs.flowId);
      if (inputs.formId) body.formId = String(inputs.formId);
      if (inputs.metadata && typeof inputs.metadata === 'object') Object.assign(body, inputs.metadata);
      const res = await c.fetchKinn(c.withWs('/api/ai/threads', wsId), {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return ok({ thread: res?.data || res });
    } catch (e) { return fail(e); }
  },

  async kinn_ai_get_thread(node, msg, inputs, opts) {
    try {
      const c = buildKinnClient(opts);
      const wsId = c.resolveWorkspaceId(inputs);
      const threadId = String(inputs.threadId || '').trim();
      if (!threadId) return fail('threadId requis');
      const res = await c.fetchKinn(c.withWs(`/api/ai/threads/${encodeURIComponent(threadId)}`, wsId));
      const thread = res?.thread || res?.data || res;
      const messages = res?.messages || (res?.data && res.data.messages) || [];
      return ok({ thread, messages, messageCount: messages.length });
    } catch (e) { return fail(e); }
  },

  async kinn_ai_delete_thread(node, msg, inputs, opts) {
    try {
      const c = buildKinnClient(opts);
      const wsId = c.resolveWorkspaceId(inputs);
      const threadId = String(inputs.threadId || '').trim();
      if (!threadId) return fail('threadId requis');
      await c.fetchKinn(c.withWs(`/api/ai/threads/${encodeURIComponent(threadId)}`, wsId), { method: 'DELETE' });
      return ok({ deleted: true, threadId });
    } catch (e) { return fail(e); }
  },

  async kinn_ai_list_agents(node, msg, inputs, opts) {
    try {
      const c = buildKinnClient(opts);
      const wsId = c.resolveWorkspaceId(inputs);
      if (!wsId) return fail('workspaceId requis');
      const res = await c.fetchKinn(c.withWs('/api/ai/agents/available', wsId));
      const agents = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      return ok({ agents, count: agents.length });
    } catch (e) { return fail(e); }
  },

  // ── Send message AVEC STREAMING SSE ────────────────────────────────────
  // Pattern identique à openai_chat_completion : opts.log() est appelé à
  // chaque chunk reçu pour que le frontend voie la réponse se construire en
  // temps réel dans l'UI exec-result-viewer.
  async kinn_ai_send_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    try {
      const c = buildKinnClient(opts);
      const wsId = c.resolveWorkspaceId(inputs);
      const text = String(inputs.message || inputs.text || '').trim();
      if (!text) return fail('message (texte) requis');

      // 1. Récupère ou crée le thread
      let threadId = String(inputs.threadId || '').trim();
      if (!threadId) {
        if (!wsId) return fail('workspaceId requis pour créer un nouveau thread');
        log('Création d\'un thread Kinn...');
        const created = await c.fetchKinn(c.withWs('/api/ai/threads', wsId), {
          method: 'POST',
          body: JSON.stringify({
            mode: String(inputs.mode || 'chat'),
            title: String(inputs.title || text.slice(0, 60)),
            ...(inputs.agentId ? { agentId: inputs.agentId } : {}),
          }),
        });
        const t = created?.data || created;
        threadId = t._id || t.id;
        log(`Thread ${threadId} créé`);
      }

      // 2. Stream POST /messages
      const url = c.withWs(`/api/ai/threads/${encodeURIComponent(threadId)}/messages`, wsId);
      const body = {
        content: text,
        ...(inputs.attachments ? { attachments: inputs.attachments } : {}),
        ...(inputs.agentId ? { agentId: inputs.agentId } : {}),
      };

      let assistantText = '';
      const toolCalls = [];
      const streamEvents = [];
      let pendingToolBuf = new Map(); // toolId → accumulated args buf

      log('Envoi du message + ouverture stream...');
      for await (const ev of c.streamKinn(url, { method: 'POST', body: JSON.stringify(body) })) {
        const t = ev.type;
        // Persist event normalisé pour debug / output
        streamEvents.push(ev);

        if (t === 'message' && typeof ev.text === 'string') {
          assistantText += ev.text;
          log(assistantText);
        } else if (t === 'tool.start') {
          toolCalls.push({ id: ev.id, name: ev.name, args: {}, _argsBuf: '', status: 'running' });
          pendingToolBuf.set(ev.id, '');
          log(`${assistantText}\n→ Tool: ${ev.name}…`);
        } else if (t === 'tool.input_delta') {
          const cur = pendingToolBuf.get(ev.id) || '';
          const next = cur + (ev.text || '');
          pendingToolBuf.set(ev.id, next);
          const tc = toolCalls.find(x => x.id === ev.id);
          if (tc) tc._argsBuf = next;
        } else if (t === 'tool.end') {
          const tc = toolCalls.find(x => x.id === ev.id);
          if (tc) {
            try { tc.args = ev.args || (tc._argsBuf ? JSON.parse(tc._argsBuf) : {}); } catch { tc.args = tc._argsBuf || {}; }
            tc.result = ev.result;
            tc.status = ev.status || 'success';
            tc.duration = ev.duration;
            delete tc._argsBuf;
          }
          log(`${assistantText}\n✓ Tool ${ev.name} (${ev.duration || 0}ms)`);
        } else if (t === 'done') {
          log(assistantText || '(réponse vide)');
          break;
        } else if (t === 'error') {
          throw new Error(ev.message || ev.error || 'Stream error');
        }
      }

      // Cleanup _argsBuf résiduels
      for (const tc of toolCalls) delete tc._argsBuf;

      return ok({
        threadId,
        message: {
          role: 'assistant',
          content: assistantText,
          toolCalls,
        },
        text: assistantText,
        toolCalls,
        events: streamEvents.length,
      });
    } catch (e) { return fail(e); }
  },

  // ── Continuer un thread existant (wrapper send_message) ────────────────
  async kinn_ai_continue_thread(node, msg, inputs, opts) {
    if (!inputs.threadId) return fail('threadId requis');
    return module.exports.kinn_ai_send_message(node, msg, inputs, opts);
  },

  // ── Répondre à une pendingQuestion posée par l'agent ───────────────────
  async kinn_ai_answer_question(node, msg, inputs, opts) {
    try {
      const c = buildKinnClient(opts);
      const wsId = c.resolveWorkspaceId(inputs);
      const threadId = String(inputs.threadId || '').trim();
      if (!threadId) return fail('threadId requis');
      const answer = inputs.answer;
      if (answer == null) return fail('answer requis (texte ou objet selon le questionType)');
      const res = await c.fetchKinn(c.withWs(`/api/ai/threads/${encodeURIComponent(threadId)}/answer`, wsId), {
        method: 'POST',
        body: JSON.stringify({ answer }),
      });
      return ok({ message: res?.data || res });
    } catch (e) { return fail(e); }
  },

  // ── Classify & Extract (style openai_classify / openai_extract) ────────
  async kinn_ai_classify(node, msg, inputs, opts) {
    try {
      const text = String(inputs.text || '').trim();
      const categories = Array.isArray(inputs.categories) ? inputs.categories : [];
      if (!text) return fail('text requis');
      if (!categories.length) return fail('categories requis (array)');

      // On délègue à l'assistant via send_message + prompt structuré
      const prompt = `Classe le texte suivant dans UNE de ces catégories : ${categories.map(c => c.name || c).join(', ')}.
Texte :
"""${text}"""

Réponds UNIQUEMENT par un JSON {"category": "<nom>", "confidence": 0..1}.`;

      const res = await module.exports.kinn_ai_send_message(node, msg, {
        ...inputs,
        message: prompt,
      }, opts);
      if (!res.ok) return res;
      let parsed = {};
      try { parsed = JSON.parse(res.text || '{}'); } catch {}
      return ok({
        category: parsed.category || null,
        confidence: parsed.confidence || null,
        raw: res.text,
        _output: parsed.category || null, // routage multi-output basé sur les catégories
      });
    } catch (e) { return fail(e); }
  },

  // ─── Design IA → Builder ───────────────────────────────────────────────
  // Génère un graph workflow via l'agent Kinn en mode "workflow".
  // L'output est directement consommable par kinn_create_flow ({graph}).
  async kinn_ai_design_flow(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    try {
      const c = require('./_helpers').buildKinnClient(opts);
      const wsId = c.resolveWorkspaceId(inputs);
      if (!wsId) return { ok: false, error: 'workspaceId requis' };
      const description = String(inputs.description || inputs.prompt || '').trim();
      if (!description) return { ok: false, error: 'description requise (langage naturel)' };

      // 1. Crée un thread mode workflow → côté Kinn, l'agent va éditer un flow draft
      log('Création d\'un thread workflow dans Kinn...');
      const created = await c.fetchKinn(c.withWs('/api/ai/threads', wsId), {
        method: 'POST',
        body: JSON.stringify({
          mode: 'workflow',
          title: `Design: ${description.slice(0, 80)}`,
          ...(inputs.agentId ? { agentId: inputs.agentId } : {}),
        }),
      });
      const t = created?.data || created;
      const threadId = t._id || t.id;
      log(`Thread ${threadId} créé, envoi du brief à l'agent...`);

      // 2. Envoie le prompt structuré
      const prompt = `Conçois un workflow Kinn qui répond à : "${description}".
${inputs.constraints ? '\nContraintes :\n' + String(inputs.constraints) : ''}
${inputs.providers ? '\nProviders à utiliser : ' + String(inputs.providers) : ''}

Crée le graph (nodes + edges) avec les bons templates et arguments. Réponds par une explication courte de tes choix à la fin.`;

      let assistantText = '';
      const url = c.withWs(`/api/ai/threads/${encodeURIComponent(threadId)}/messages`, wsId);
      for await (const ev of c.streamKinn(url, {
        method: 'POST',
        body: JSON.stringify({ content: prompt }),
      })) {
        if (ev.type === 'message' && typeof ev.text === 'string') {
          assistantText += ev.text;
          log(assistantText);
        } else if (ev.type === 'tool.start') {
          log(`${assistantText}\n→ ${ev.name}…`);
        } else if (ev.type === 'tool.end') {
          log(`${assistantText}\n✓ ${ev.name}`);
        } else if (ev.type === 'done') break;
      }

      // 3. Récupère le graph que l'agent a construit côté Kinn
      log('Récupération du graph final...');
      const threadFinal = await c.fetchKinn(c.withWs(`/api/ai/threads/${encodeURIComponent(threadId)}`, wsId));
      const draft = threadFinal?.thread || threadFinal?.data || threadFinal;
      const graph = (draft && draft.metadata && draft.metadata.draftGraph)
        || draft.graph
        || (draft.thread && draft.thread.graph)
        || { nodes: [], edges: [] };

      const designedName = (draft.metadata && draft.metadata.draftName)
        || draft.title
        || description.slice(0, 80);

      return {
        ok: true,
        name: designedName,
        description,
        mode: 'workflow',
        graph,
        rationale: assistantText,
        threadId,
      };
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
  },

  // Génère un schema de form via l'agent Kinn en mode "form".
  // L'output est consommable par kinn_create_form ({schema}).
  async kinn_ai_design_form(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    try {
      const c = require('./_helpers').buildKinnClient(opts);
      const wsId = c.resolveWorkspaceId(inputs);
      if (!wsId) return { ok: false, error: 'workspaceId requis' };
      const description = String(inputs.description || inputs.prompt || '').trim();
      if (!description) return { ok: false, error: 'description requise (langage naturel)' };

      log('Création d\'un thread form dans Kinn...');
      const created = await c.fetchKinn(c.withWs('/api/ai/threads', wsId), {
        method: 'POST',
        body: JSON.stringify({
          mode: 'form',
          title: `Design form: ${description.slice(0, 80)}`,
          ...(inputs.agentId ? { agentId: inputs.agentId } : {}),
        }),
      });
      const t = created?.data || created;
      const threadId = t._id || t.id;

      const prompt = `Conçois un formulaire Kinn pour : "${description}".
${inputs.constraints ? '\nContraintes :\n' + String(inputs.constraints) : ''}

Génère les champs (type, key, label, validators, col, visibleIf, etc.). Réponds par une justification courte à la fin.`;

      let assistantText = '';
      const url = c.withWs(`/api/ai/threads/${encodeURIComponent(threadId)}/messages`, wsId);
      for await (const ev of c.streamKinn(url, {
        method: 'POST',
        body: JSON.stringify({ content: prompt }),
      })) {
        if (ev.type === 'message' && typeof ev.text === 'string') {
          assistantText += ev.text;
          log(assistantText);
        } else if (ev.type === 'done') break;
      }

      log('Récupération du schema final...');
      const threadFinal = await c.fetchKinn(c.withWs(`/api/ai/threads/${encodeURIComponent(threadId)}`, wsId));
      const draft = threadFinal?.thread || threadFinal?.data || threadFinal;
      const schema = (draft && draft.metadata && draft.metadata.draftSchema)
        || draft.schema
        || (draft.thread && draft.thread.schema)
        || { fields: [] };

      const designedName = (draft.metadata && draft.metadata.draftName)
        || draft.title
        || description.slice(0, 80);

      return {
        ok: true,
        name: designedName,
        description,
        schema,
        rationale: assistantText,
        threadId,
      };
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
  },

  async kinn_ai_extract(node, msg, inputs, opts) {
    try {
      const text = String(inputs.text || '').trim();
      const schema = inputs.schema;
      if (!text) return fail('text requis');
      if (!schema || typeof schema !== 'object') return fail('schema (JSON) requis');

      const prompt = `Extrais les informations du texte suivant selon ce schéma JSON :
${JSON.stringify(schema, null, 2)}

Texte :
"""${text}"""

Réponds UNIQUEMENT par un JSON valide qui respecte exactement le schéma.`;

      const res = await module.exports.kinn_ai_send_message(node, msg, {
        ...inputs,
        message: prompt,
      }, opts);
      if (!res.ok) return res;
      let extracted = {};
      try { extracted = JSON.parse(res.text || '{}'); } catch {}
      return ok({ extracted, raw: res.text });
    } catch (e) { return fail(e); }
  },
};
