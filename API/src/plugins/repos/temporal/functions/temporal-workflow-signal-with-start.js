module.exports = {
  async temporal_workflow_signal_with_start(node, msg, inputs, opts) {
    let Client, Connection;
    try { ({ Client, Connection } = require('@temporalio/client')); } catch { return { ok: false, error: "Le package '@temporalio/client' n'est pas installé." }; }
    const c = (opts && opts.credentials) || {};
    const address = String(c.address || c.host || c.baseUrl || '').trim();
    const namespace = String(c.namespace || 'default').trim();
    if (!address) return { ok: false, error: 'address requis.' };
    const d = inputs || {};
    const workflowId = String(d.workflow_id || '').trim();
    const workflowType = String(d.workflow_type || '').trim();
    const taskQueue = String(d.task_queue || '').trim();
    const signal = String(d.signal || '').trim();
    if (!workflowId || !workflowType || !taskQueue || !signal) return { ok: false, error: 'workflow_id, workflow_type, task_queue et signal requis.' };
    const wfArgs = d.args ? (typeof d.args === 'object' ? d.args : JSON.parse(String(d.args))) : [];
    const signalArgs = d.signal_args ? (typeof d.signal_args === 'object' ? d.signal_args : JSON.parse(String(d.signal_args))) : [];
    let connection;
    try {
      connection = await Connection.connect({ address, ...(c.apiKey ? { apiKey: c.apiKey } : {}) });
      const client = new Client({ connection, namespace });
      const handle = await client.workflow.signalWithStart(workflowType, {
        workflowId,
        taskQueue,
        args: Array.isArray(wfArgs) ? wfArgs : [wfArgs],
        signal,
        signalArgs: Array.isArray(signalArgs) ? signalArgs : [signalArgs]
      });
      return { ok: true, status: 200, message: 'SignalWithStart exécuté.', raw: { workflowId: handle.workflowId, runId: handle.firstExecutionRunId || '' } };
    } catch (e) {
      return { ok: false, error: e.message };
    } finally {
      try { if (connection && connection.close) await connection.close(); } catch {}
    }
  }
};
