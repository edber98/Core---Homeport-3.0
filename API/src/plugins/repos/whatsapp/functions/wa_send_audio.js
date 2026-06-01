module.exports = {
  async wa_send_audio(node, msg, inputs, opts) {
    const { whatsappRequest, getPhoneNumberId, resolveFileArg, uploadMediaBuffer } = require("./utils").utils;
    const args = inputs || {};
    const phoneNumberId = getPhoneNumberId(opts);
    const audio = {};
    const fileData = await resolveFileArg(args.audio_url, opts);
    if (fileData) {
      const media = await uploadMediaBuffer(opts, fileData.buffer, fileData.mimeType, fileData.name);
      audio.id = media.id;
    } else if (args.audio_url) audio.link = args.audio_url;
    if (args.audio_id) audio.id = args.audio_id;
    const body = { messaging_product: "whatsapp", to: args.to || "", type: "audio", audio };
    const result = await whatsappRequest(opts, "POST", `/${phoneNumberId}/messages`, body);
    if (!result.ok) return result;
    return { ok: true, message_id: result.messages?.[0]?.id || "", to: args.to || "", type: "audio", status: "sent" };
  }
};
