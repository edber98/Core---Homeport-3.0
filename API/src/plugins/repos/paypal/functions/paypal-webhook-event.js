module.exports = {
  async paypal_webhook_event(node, msg, inputs, opts) {
    const payload = (msg && msg.payload) || inputs || {};
    return {
      ok: true,
      id: payload.id || "",
      eventType: payload.event_type || payload.eventType || "",
      resourceType: payload.resource_type || payload.resourceType || "",
      payload: JSON.stringify(payload)
    };
  }
};
