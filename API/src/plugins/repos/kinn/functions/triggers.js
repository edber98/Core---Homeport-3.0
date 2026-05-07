// Handlers pour les nodes triggers (events) du plugin Kinn.
// Comme tous les triggers, ce ne sont que des passe-plat : ils reçoivent
// le payload via msg.payload depuis le trigger adapter et l'exposent au flow.

module.exports = {
  // Reçoit { runId, flowId, status, output, durationMs } depuis Kinn webhook
  async kinn_on_run_complete(node, msg, inputs, opts) {
    const data = (msg && msg.payload) || {};
    return {
      ok: true,
      runId: data.runId || data.id || '',
      flowId: data.flowId || '',
      status: data.status || '',
      input: data.input || null,
      output: data.output || null,
      startedAt: data.startedAt || '',
      finishedAt: data.finishedAt || '',
      durationMs: data.durationMs || 0,
      error: data.error || '',
    };
  },

  // Reçoit { threadId, messageId, role, content, toolCalls } depuis Kinn webhook
  async kinn_on_thread_message(node, msg, inputs, opts) {
    const data = (msg && msg.payload) || {};
    return {
      ok: true,
      threadId: data.threadId || '',
      messageId: data.messageId || data.id || '',
      role: data.role || 'assistant',
      content: data.content || data.text || '',
      toolCalls: Array.isArray(data.toolCalls) ? data.toolCalls : [],
      createdAt: data.createdAt || '',
    };
  },

  // Reçoit { flowId, triggerType, eventPayload } depuis Kinn webhook (relais)
  async kinn_on_deployment_event(node, msg, inputs, opts) {
    const data = (msg && msg.payload) || {};
    return {
      ok: true,
      flowId: data.flowId || '',
      triggerType: data.triggerType || '',
      eventPayload: data.eventPayload || data.payload || {},
      receivedAt: data.receivedAt || new Date().toISOString(),
    };
  },
};
