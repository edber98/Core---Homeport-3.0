module.exports = {
  async email_read(node, msg, inputs, opts) {
    // Placeholder: would connect IMAP and fetch emails
    return { ok: true, messages: [] };
  },
  async email_new_message(node, msg, inputs, opts) {
    // Event trigger placeholder
    return { ok: true, event: 'new_message' };
  }
};
