// Handlers pour les nodes Workflows du plugin Kinn.
// Couvre : list/get/create/update/delete + run/list_runs/get_run/cancel_run.

const { buildKinnClient, ok, fail } = require('./_helpers');

module.exports = {
  async kinn_list_flows(node, msg, inputs, opts) {
    try {
      const c = await buildKinnClient(opts);
      const wsId = c.resolveWorkspaceId(inputs);
      if (!wsId) return fail('workspaceId requis (argument ou credentials par défaut)');
      const params = new URLSearchParams({ workspaceId: wsId });
      if (inputs.mode) params.set('mode', String(inputs.mode));
      if (inputs.search) params.set('search', String(inputs.search));
      if (inputs.deployed != null) params.set('deployed', inputs.deployed ? '1' : '0');
      const limit = Math.min(parseInt(inputs.limit || 100, 10), 200);
      params.set('limit', String(limit));
      const res = await c.fetchKinn(`/api/workspaces/${encodeURIComponent(wsId)}/flows?${params.toString()}`);
      const flows = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      return ok({ flows, count: flows.length });
    } catch (e) { return fail(e); }
  },

  async kinn_get_flow(node, msg, inputs, opts) {
    try {
      const c = await buildKinnClient(opts);
      const flowId = String(inputs.flowId || '').trim();
      if (!flowId) return fail('flowId requis');
      const res = await c.fetchKinn(`/api/flows/${encodeURIComponent(flowId)}`);
      const flow = res?.data || res;
      return ok({ flow });
    } catch (e) { return fail(e); }
  },

  async kinn_create_flow(node, msg, inputs, opts) {
    try {
      const c = await buildKinnClient(opts);
      const wsId = c.resolveWorkspaceId(inputs);
      if (!wsId) return fail('workspaceId requis');
      const body = {
        name: String(inputs.name || 'Nouveau flow').slice(0, 200),
        description: inputs.description ? String(inputs.description) : '',
        mode: String(inputs.mode || 'workflow'),
        graph: inputs.graph || { nodes: [], edges: [] },
      };
      const res = await c.fetchKinn(c.withWs(`/api/workspaces/${encodeURIComponent(wsId)}/flows`, wsId), {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return ok({ flow: res?.data || res });
    } catch (e) { return fail(e); }
  },

  async kinn_update_flow(node, msg, inputs, opts) {
    try {
      const c = await buildKinnClient(opts);
      const flowId = String(inputs.flowId || '').trim();
      if (!flowId) return fail('flowId requis');
      const body = {};
      if (inputs.name != null) body.name = String(inputs.name);
      if (inputs.description != null) body.description = String(inputs.description);
      if (inputs.graph) body.graph = inputs.graph;
      const res = await c.fetchKinn(`/api/flows/${encodeURIComponent(flowId)}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      return ok({ flow: res?.data || res });
    } catch (e) { return fail(e); }
  },

  async kinn_delete_flow(node, msg, inputs, opts) {
    try {
      const c = await buildKinnClient(opts);
      const flowId = String(inputs.flowId || '').trim();
      if (!flowId) return fail('flowId requis');
      await c.fetchKinn(`/api/flows/${encodeURIComponent(flowId)}`, { method: 'DELETE' });
      return ok({ deleted: true, flowId });
    } catch (e) { return fail(e); }
  },

  async kinn_run_flow(node, msg, inputs, opts) {
    try {
      const c = await buildKinnClient(opts);
      const flowId = String(inputs.flowId || '').trim();
      if (!flowId) return fail('flowId requis');
      const body = {
        input: inputs.runInput || {},
        ...(inputs.async === true ? { async: true } : {}),
      };
      const res = await c.fetchKinn(`/api/flows/${encodeURIComponent(flowId)}/runs`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const run = res?.data || res;

      // Mode synchrone : poll jusqu'à completion (timeout 5 min par défaut)
      if (inputs.wait === true && run?.id) {
        const log = (opts && opts.log) ? opts.log : () => {};
        const timeoutMs = parseInt(inputs.waitTimeoutMs || 5 * 60 * 1000, 10);
        const start = Date.now();
        log(`Run ${run.id} démarrée, attente de la fin...`);
        while (Date.now() - start < timeoutMs) {
          await new Promise(r => setTimeout(r, 1500));
          const polled = await c.fetchKinn(`/api/runs/${encodeURIComponent(run.id)}`);
          const cur = polled?.data || polled;
          if (cur && ['completed', 'failed', 'cancelled', 'error'].includes(cur.status)) {
            log(`Run ${run.id} → ${cur.status}`);
            return ok({ run: cur });
          }
        }
        return fail(`run_timeout après ${timeoutMs}ms`, { run });
      }
      return ok({ run });
    } catch (e) { return fail(e); }
  },

  async kinn_list_runs(node, msg, inputs, opts) {
    try {
      const c = await buildKinnClient(opts);
      const wsId = c.resolveWorkspaceId(inputs);
      const params = new URLSearchParams();
      if (wsId) params.set('workspaceId', wsId);
      if (inputs.flowId) params.set('flowId', String(inputs.flowId));
      if (inputs.status) params.set('status', String(inputs.status));
      const limit = Math.min(parseInt(inputs.limit || 50, 10), 200);
      params.set('limit', String(limit));
      const res = await c.fetchKinn(`/api/runs?${params.toString()}`);
      const runs = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      return ok({ runs, count: runs.length });
    } catch (e) { return fail(e); }
  },

  async kinn_get_run(node, msg, inputs, opts) {
    try {
      const c = await buildKinnClient(opts);
      const runId = String(inputs.runId || '').trim();
      if (!runId) return fail('runId requis');
      const res = await c.fetchKinn(`/api/runs/${encodeURIComponent(runId)}`);
      return ok({ run: res?.data || res });
    } catch (e) { return fail(e); }
  },

  async kinn_cancel_run(node, msg, inputs, opts) {
    try {
      const c = await buildKinnClient(opts);
      const runId = String(inputs.runId || '').trim();
      if (!runId) return fail('runId requis');
      const res = await c.fetchKinn(`/api/runs/${encodeURIComponent(runId)}/cancel`, { method: 'POST' });
      return ok({ run: res?.data || res, cancelled: true });
    } catch (e) { return fail(e); }
  },
};
