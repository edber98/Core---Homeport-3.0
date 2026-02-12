module.exports = {
  async email_read(node, msg, inputs, opts) {
    // Placeholder: would connect IMAP and fetch emails
    return { ok: true, messages: [] };
  },
  async email_new_message(node, msg, inputs, opts) {
    // Parse raw email payload from trigger
    const data = (msg && msg.payload) || {};
    return {
      ok: true,
      from: data.from || '',
      to: data.to || '',
      subject: data.subject || '',
      text: data.text || '',
      html: data.html || '',
      date: data.date || '',
      messageId: data.messageId || '',
      attachmentCount: data.attachmentCount || 0,
    };
  }
};
