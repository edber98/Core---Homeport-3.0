module.exports = {
  async wa_send_image(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { whatsappRequest, getPhoneNumberId, resolveFileArg, uploadMediaBuffer } = require("./utils").utils;
      const args = inputs || {};
      const phoneNumberId = getPhoneNumberId(opts);
      const image = {};
  
      // Resolve fileRef or URL → upload to WhatsApp media, then use media id
      const fileData = await resolveFileArg(args.image_url, opts);
      if (fileData) {
        log('Téléversement de l\'image vers WhatsApp...');
        const media = await uploadMediaBuffer(opts, fileData.buffer, fileData.mimeType, fileData.name);
        image.id = media.id;
      } else if (args.image_url !== undefined && args.image_url !== null && args.image_url !== "") {
        image.link = args.image_url;
      }
  
      if (args.image_id !== undefined && args.image_id !== null && args.image_id !== "") image.id = args.image_id;
      if (args.caption !== undefined && args.caption !== null && args.caption !== "") image.caption = args.caption;
      const body = {
        messaging_product: "whatsapp",
        to: args.to || "",
        type: "image",
        image
      };
      const result = await whatsappRequest(opts, "POST", `/${phoneNumberId}/messages`, body);
      if (!result.ok) return result;
      return { ok: true, message_id: (result.messages && result.messages[0] && result.messages[0].id) || "", to: args.to || "", type: "image", status: "sent" };
    }
};
