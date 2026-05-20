module.exports = {
  async wa_webhook_event(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const data = msg || {};
      const entry = (data.entry && data.entry[0]) || {};
      const changes = (entry.changes && entry.changes[0]) || {};
      const value = changes.value || {};
      const message = (value.messages && value.messages[0]) || {};
      const contact = (value.contacts && value.contacts[0]) || {};
      const status = (value.statuses && value.statuses[0]) || {};
      return {
        ok: true,
        from: message.from || status.recipient_id || "",
        contact_name: contact.profile?.name || "",
        message_id: message.id || status.id || "",
        message_type: message.type || "status",
        text: message.text?.body || "",
        timestamp: message.timestamp || status.timestamp || "",
        status: status.status || "",
        phone_number_id: value.metadata?.phone_number_id || ""
      };
    }
};
