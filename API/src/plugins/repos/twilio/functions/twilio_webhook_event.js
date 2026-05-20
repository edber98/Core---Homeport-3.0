module.exports = {
  async twilio_webhook_event(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const data = msg || {};
      return {
        ok: true,
        message_sid: data.MessageSid || data.CallSid || "",
        from: data.From || "",
        to: data.To || "",
        body: data.Body || "",
        status: data.CallStatus || data.SmsStatus || data.MessageStatus || "",
        direction: data.Direction || "",
        account_sid: data.AccountSid || "",
        num_media: data.NumMedia || "0"
      };
    }
};
