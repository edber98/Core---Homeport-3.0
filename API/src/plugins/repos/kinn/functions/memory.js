// Handlers Memory pour le plugin Kinn (user + project memory).
const { buildKinnClient, ok, fail } = require('./_helpers');

module.exports = {
  async kinn_get_user_memory(node, msg, inputs, opts) {
    try {
      const c = buildKinnClient(opts);
      const wsId = c.resolveWorkspaceId(inputs);
      const res = await c.fetchKinn(c.withWs('/api/ai/memory', wsId));
      const entries = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      return ok({ entries, count: entries.length });
    } catch (e) { return fail(e); }
  },

  async kinn_save_user_memory(node, msg, inputs, opts) {
    try {
      const c = buildKinnClient(opts);
      const wsId = c.resolveWorkspaceId(inputs);
      const content = String(inputs.content || '').trim();
      if (!content) return fail('content requis');
      const body = { content };
      if (inputs.key) body.key = String(inputs.key);
      const res = await c.fetchKinn(c.withWs('/api/ai/memory', wsId), {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return ok({ entry: res?.data || res });
    } catch (e) { return fail(e); }
  },

  async kinn_get_project_memory(node, msg, inputs, opts) {
    try {
      const c = buildKinnClient(opts);
      const wsId = c.resolveWorkspaceId(inputs);
      const elementType = String(inputs.elementType || 'flow');
      const elementId = String(inputs.elementId || '').trim();
      if (!elementId) return fail('elementId requis (flowId ou formId)');
      const res = await c.fetchKinn(c.withWs(
        `/api/ai/project-memory/${encodeURIComponent(elementType)}/${encodeURIComponent(elementId)}`,
        wsId,
      ));
      return ok({ memory: res?.data || res });
    } catch (e) { return fail(e); }
  },

  async kinn_save_project_memory(node, msg, inputs, opts) {
    try {
      const c = buildKinnClient(opts);
      const wsId = c.resolveWorkspaceId(inputs);
      const elementType = String(inputs.elementType || 'flow');
      const elementId = String(inputs.elementId || '').trim();
      const content = String(inputs.content || '').trim();
      if (!elementId) return fail('elementId requis');
      if (!content) return fail('content requis');
      const res = await c.fetchKinn(c.withWs(
        `/api/ai/project-memory/${encodeURIComponent(elementType)}/${encodeURIComponent(elementId)}`,
        wsId,
      ), {
        method: 'PUT',
        body: JSON.stringify({ memory: content }),
      });
      return ok({ memory: res?.data || res });
    } catch (e) { return fail(e); }
  },
};
