// Handlers Workspace pour le plugin Kinn.
const { buildKinnClient, ok, fail } = require('./_helpers');

module.exports = {
  async kinn_list_workspaces(node, msg, inputs, opts) {
    try {
      const c = await buildKinnClient(opts);
      const limit = Math.min(parseInt(inputs.limit || 100, 10), 200);
      const res = await c.fetchKinn(`/api/workspaces?page=1&limit=${limit}`);
      const workspaces = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      return ok({ workspaces, count: workspaces.length });
    } catch (e) { return fail(e); }
  },

  async kinn_list_credentials(node, msg, inputs, opts) {
    try {
      const c = await buildKinnClient(opts);
      const wsId = c.resolveWorkspaceId(inputs);
      if (!wsId) return fail('workspaceId requis');
      const params = new URLSearchParams();
      if (inputs.providerKey) params.set('providerKey', String(inputs.providerKey));
      const path = `/api/workspaces/${encodeURIComponent(wsId)}/credentials${params.toString() ? '?' + params.toString() : ''}`;
      const res = await c.fetchKinn(path);
      const credentials = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      // Sécurité : on retire les valeurs éventuellement leakées
      const safe = credentials.map(cr => ({
        id: cr.id, name: cr.name, providerKey: cr.providerKey,
        createdBy: cr.createdBy, createdAt: cr.createdAt,
      }));
      return ok({ credentials: safe, count: safe.length });
    } catch (e) { return fail(e); }
  },
};
