module.exports = {
  async outlook_create_event(node, msg, inputs, opts) {
    return { ok: true, created: true };
  },
  async outlook_update_event(node, msg, inputs, opts) {
    return { ok: true, updated: true };
  },
  async outlook_rsvp_event(node, msg, inputs, opts) {
    return { ok: true, rsvped: node.args?.response || 'accepted' };
  },
  async outlook_webhook_event(node, msg, inputs, opts) {
    return { ok: true, event: 'outlook_cal_webhook' };
  }
};
