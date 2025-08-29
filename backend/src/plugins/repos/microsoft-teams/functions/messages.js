module.exports = {
  async teams_post_message(node, msg, inputs, opts) {
    return { ok: true, posted: true, channelId: node.args?.channelId };
  },
  async teams_adaptive_card(node, msg, inputs, opts) {
    return { ok: true, sent: true, type: 'adaptive_card' };
  },
  async teams_incoming_webhook(node, msg, inputs, opts) {
    return { ok: true, event: 'incoming_webhook' };
  }
};
