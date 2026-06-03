module.exports = {
  async wa_mark_read(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { whatsappRequest, getPhoneNumberId } = require("./utils").utils;
      const args = inputs || {};
      const phoneNumberId = getPhoneNumberId(opts);
      const body = {
        messaging_product: "whatsapp",
        status: "read",
        message_id: args.message_id || ""
      };
      const result = await whatsappRequest(opts, "POST", `/${phoneNumberId}/messages`, body);
      if (!result.ok) return result;
      return { ok: true, status: result.success ? "success" : "unknown", message: "Message marqué comme lu" };
    }
};
