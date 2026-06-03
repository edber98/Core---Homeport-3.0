module.exports = {
  async wa_send_video(node, msg, inputs, opts) {
    const { whatsappRequest, getPhoneNumberId, resolveFileArg, uploadMediaBuffer } = require("./utils").utils;
    const args = inputs || {};
    const phoneNumberId = getPhoneNumberId(opts);
    const video = {};
    const fileData = await resolveFileArg(args.video_url, opts);
    if (fileData) {
      const media = await uploadMediaBuffer(opts, fileData.buffer, fileData.mimeType, fileData.name);
      video.id = media.id;
    } else if (args.video_url) video.link = args.video_url;
    if (args.video_id) video.id = args.video_id;
    if (args.caption) video.caption = args.caption;
    const body = { messaging_product: "whatsapp", to: args.to || "", type: "video", video };
    const result = await whatsappRequest(opts, "POST", `/${phoneNumberId}/messages`, body);
    if (!result.ok) return result;
    return { ok: true, message_id: result.messages?.[0]?.id || "", to: args.to || "", type: "video", status: "sent" };
  }
};
