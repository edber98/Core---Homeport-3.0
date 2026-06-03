module.exports = {
  async clay_webhook_event(node, msg, inputs) {
    const d = inputs || {};
    return {
      ok: true,
      event: String(d.event || "clay.webhook"),
      id: String(d.id || ""),
      payload: d.payload !== undefined ? d.payload : d
    };
  }
};
