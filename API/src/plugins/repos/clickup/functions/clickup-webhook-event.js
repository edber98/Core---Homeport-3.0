module.exports = {
  async clickup_webhook_event(node, msg, inputs, opts) {
    const body = (msg && msg.body) || {};
    return {
      ok: true,
      event: body.event || "",
      taskId: body.task_id || "",
      webhookId: body.webhook_id || "",
      timestamp: new Date().toISOString(),
      payload: JSON.stringify(body)
    };
  }
};
