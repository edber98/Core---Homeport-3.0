module.exports = {
  async email_read(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    // Placeholder: would connect IMAP and fetch emails
    return { ok: true, messages: [] };
  },
  async email_new_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
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
      // Tableau de fileRef ({_type, fileId, name, mimeType, size}) — chaque
      // pièce jointe est déjà stockée dans FileRecord par l'adapter IMAP.
      // Connecte-le à un node loop pour itérer + uploader/transformer.
      attachments: Array.isArray(data.attachments) ? data.attachments : [],
    };
  }
};
