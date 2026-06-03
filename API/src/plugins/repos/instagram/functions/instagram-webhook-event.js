module.exports = {
  async instagram_webhook_event(node, msg, inputs, opts) {
    return {
      ok: true,
      event: "instagram_webhook",
      object: inputs?.object || "",
      payload: JSON.stringify(inputs || {})
    };
  }
};
