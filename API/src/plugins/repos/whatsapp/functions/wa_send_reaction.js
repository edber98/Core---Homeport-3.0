module.exports = {
  async wa_send_reaction(node, msg, inputs, opts) {
    const { whatsappRequest, getPhoneNumberId } = require("./utils").utils;
    const args = inputs || {};
    const phoneNumberId = getPhoneNumberId(opts);
    if (!args.message_id) return { ok: false, error: "message_id requis." };
    const body = {
      messaging_product: "whatsapp",
      to: args.to || "",
      type: "reaction",
      reaction: { message_id: args.message_id, emoji: args.emoji || "👍" }
    };
    const result = await whatsappRequest(opts, "POST", `/${phoneNumberId}/messages`, body);
    if (!result.ok) return result;
    return { ok: true, message_id: result.messages?.[0]?.id || "", to: args.to || "", type: "reaction", status: "sent" };
  }
};
