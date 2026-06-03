module.exports = {
  async outlook_webhook_event(node, msg, inputs, opts) {
    return {
      ok: true,
      event: "outlook_cal_webhook",
      provider: "outlook",
      payload: JSON.stringify(inputs || {})
    };
  }
};
