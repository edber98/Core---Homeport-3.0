module.exports = {
  async linear_webhook_event(node, msg, inputs, opts) {
    const body = (msg && msg.body) || {};
    return {
      ok: true,
      action: body.action || "",
      type: body.type || "",
      resourceId: body.data ? body.data.id || "" : "",
      timestamp: body.createdAt || new Date().toISOString(),
      payload: JSON.stringify(body)
    };
  }
};
