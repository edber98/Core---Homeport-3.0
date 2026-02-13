module.exports = {
  async tg_webhook_event(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const data = (msg && msg.payload) || msg || {};
    const message = data.message || data.edited_message || {};
    const callback = data.callback_query || {};
    return {
      ok: true,
      update_id: data.update_id || "",
      message_text: message.text || callback.data || "",
      message_chat_id: String(message.chat?.id || callback.message?.chat?.id || ""),
      message_from_id: String(message.from?.id || callback.from?.id || ""),
      callback_data: callback.data || ""
    };
  }
};
