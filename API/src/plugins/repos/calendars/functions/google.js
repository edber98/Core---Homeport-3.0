module.exports = {
  async gcal_create_event(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return { ok: true, created: true };
  },
  async gcal_update_event(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return { ok: true, updated: true };
  },
  async gcal_rsvp_event(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return { ok: true, rsvped: args?.response || 'accepted' };
  },
  async gcal_webhook_event(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    return { ok: true, event: 'gcal_webhook' };
  }
};
