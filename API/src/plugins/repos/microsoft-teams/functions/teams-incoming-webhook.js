module.exports = {
  async teams_incoming_webhook(node, msg, inputs, opts) {
    return {
      ok: true,
      event: "incoming_webhook",
      payload: JSON.stringify((msg && msg.payload) || inputs || {})
    };
  }
};
