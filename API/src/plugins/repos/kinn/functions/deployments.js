// Handlers pour les nodes Deployments du plugin Kinn.
const { buildKinnClient, ok, fail } = require('./_helpers');

module.exports = {
  async kinn_list_deployments(node, msg, inputs, opts) {
    try {
      const c = buildKinnClient(opts);
      const wsId = c.resolveWorkspaceId(inputs);
      if (!wsId) return fail('workspaceId requis');
      const res = await c.fetchKinn(`/api/workspaces/${encodeURIComponent(wsId)}/deployments`);
      const deployments = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      return ok({ deployments, count: deployments.length });
    } catch (e) { return fail(e); }
  },

  async kinn_deploy_flow(node, msg, inputs, opts) {
    try {
      const c = buildKinnClient(opts);
      const flowId = String(inputs.flowId || '').trim();
      if (!flowId) return fail('flowId requis');
      const res = await c.fetchKinn(`/api/flows/${encodeURIComponent(flowId)}/deploy`, { method: 'POST' });
      return ok({ deployment: res?.data || res });
    } catch (e) { return fail(e); }
  },

  async kinn_undeploy_flow(node, msg, inputs, opts) {
    try {
      const c = buildKinnClient(opts);
      const flowId = String(inputs.flowId || '').trim();
      if (!flowId) return fail('flowId requis');
      const res = await c.fetchKinn(`/api/flows/${encodeURIComponent(flowId)}/undeploy`, { method: 'POST' });
      return ok({ deployment: res?.data || res, deployed: false });
    } catch (e) { return fail(e); }
  },

  async kinn_get_deployment_status(node, msg, inputs, opts) {
    try {
      const c = buildKinnClient(opts);
      const flowId = String(inputs.flowId || '').trim();
      if (!flowId) return fail('flowId requis');
      const res = await c.fetchKinn(`/api/flows/${encodeURIComponent(flowId)}/deployment`);
      return ok({ deployment: res?.data || res });
    } catch (e) { return fail(e); }
  },
};
