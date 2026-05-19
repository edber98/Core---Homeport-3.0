module.exports = {
  async gcal_webhook_event(node, msg, inputs, opts) {
    return {
      ok: true,
      event: "gcal_webhook",
      provider: "google",
      payload: JSON.stringify(inputs || {})
    };
  }
};
