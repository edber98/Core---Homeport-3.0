module.exports = {
  async googlechat_incoming_webhook(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const data = msg || {};
    return {
      ok: true,
      type: data.type || "MESSAGE",
      eventTime: data.eventTime || "",
      spaceName: data.space?.name || "",
      senderName: data.message?.sender?.displayName || data.user?.displayName || "",
      messageText: data.message?.text || ""
    };
  }
};
