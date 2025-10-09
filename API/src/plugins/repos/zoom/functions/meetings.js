module.exports = {
  async zoom_create_meeting(node, msg, inputs, opts) {
    return { ok: true, created: true, topic: node.args?.topic };
  },
  async zoom_webhook_event(node, msg, inputs, opts) {
    return { ok: true, event: 'zoom_webhook' };
  }
};
