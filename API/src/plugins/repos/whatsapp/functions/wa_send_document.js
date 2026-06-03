module.exports = {
  async wa_send_document(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { whatsappRequest, getPhoneNumberId, resolveFileArg, uploadMediaBuffer } = require("./utils").utils;
      const args = inputs || {};
      const phoneNumberId = getPhoneNumberId(opts);
      const document = {};
  
      // Resolve fileRef or URL → upload to WhatsApp media, then use media id
      const fileData = await resolveFileArg(args.document_url, opts);
      if (fileData) {
        log('Téléversement du document vers WhatsApp...');
        const media = await uploadMediaBuffer(opts, fileData.buffer, fileData.mimeType, fileData.name);
        document.id = media.id;
        if (!args.filename) document.filename = fileData.name;
      } else if (args.document_url !== undefined && args.document_url !== null && args.document_url !== "") {
        document.link = args.document_url;
      }
  
      if (args.document_id !== undefined && args.document_id !== null && args.document_id !== "") document.id = args.document_id;
      if (args.caption !== undefined && args.caption !== null && args.caption !== "") document.caption = args.caption;
      if (args.filename !== undefined && args.filename !== null && args.filename !== "") document.filename = args.filename;
      const body = {
        messaging_product: "whatsapp",
        to: args.to || "",
        type: "document",
        document
      };
      const result = await whatsappRequest(opts, "POST", `/${phoneNumberId}/messages`, body);
      if (!result.ok) return result;
      return { ok: true, message_id: (result.messages && result.messages[0] && result.messages[0].id) || "", to: args.to || "", type: "document", status: "sent" };
    }
};
