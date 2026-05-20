const { flattenMessage } = require("./utils").utils;

module.exports = {
  async tg_send_photo(node, msg, inputs, opts) {
      const { telegramRequest, telegramMultipartRequest, resolveFileArg } = require("./utils").utils;
      const args = inputs || {};
      const resolved = await resolveFileArg(args.photo, opts);
  
      if (resolved && resolved.buffer) {
        const fields = {};
        if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") fields.chat_id = args.chat_id;
        if (args.caption !== undefined && args.caption !== null && args.caption !== "") fields.caption = args.caption;
        if (args.parse_mode !== undefined && args.parse_mode !== null && args.parse_mode !== "") fields.parse_mode = args.parse_mode;
        return flattenMessage(await telegramMultipartRequest(opts, "sendPhoto", fields, "photo", resolved.buffer, resolved.fileName, resolved.mimeType));
      }
  
      const body = {};
      if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
      if (resolved && resolved.value) body.photo = resolved.value;
      else if (args.photo !== undefined && args.photo !== null && args.photo !== "") body.photo = args.photo;
      if (args.caption !== undefined && args.caption !== null && args.caption !== "") body.caption = args.caption;
      if (args.parse_mode !== undefined && args.parse_mode !== null && args.parse_mode !== "") body.parse_mode = args.parse_mode;
      return flattenMessage(await telegramRequest(opts, "sendPhoto", body));
    }
};
