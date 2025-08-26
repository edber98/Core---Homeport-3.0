module.exports = {
  async googlechat_post_message(node, msg, inputs) {
    return { ok: true, posted: true };
  },
  async googlechat_card_message(node, msg, inputs) {
    return { ok: true, posted: true, type: 'card' };
  },
  async googlechat_incoming_webhook(node, msg, inputs) {
    return { ok: true, event: 'incoming_webhook' };
  }
};

