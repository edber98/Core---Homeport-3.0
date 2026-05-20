
module.exports = {
  async tg_send_sticker(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { telegramRequest, telegramMultipartRequest, resolveFileArg } = require("./utils").utils;
      const args = inputs || {};
  
      // Resolve file input (fileRef object, URL string, or file_id)
      const resolved = await resolveFileArg(args.sticker, opts);
  
      if (resolved && resolved.buffer) {
        // Upload via multipart/form-data
        const fields = {};
        if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") fields.chat_id = args.chat_id;
        return telegramMultipartRequest(opts, "sendSticker", fields, "sticker", resolved.buffer, resolved.fileName, resolved.mimeType);
      }
  
      // URL or file_id: use JSON body
      const body = {};
      if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
      if (resolved && resolved.value) body.sticker = resolved.value;
      else if (args.sticker !== undefined && args.sticker !== null && args.sticker !== "") body.sticker = args.sticker;
      return telegramRequest(opts, "sendSticker", body);
    }
};
