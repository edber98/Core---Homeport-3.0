const { flattenMessage } = require("./utils").utils;

module.exports = {
  async tg_send_document(node, msg, inputs, opts) {
      const { telegramRequest, telegramMultipartRequest, resolveFileArg } = require("./utils").utils;
      const args = inputs || {};
      const resolved = await resolveFileArg(args.document, opts);
  
      if (resolved && resolved.buffer) {
        const fields = {};
        if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") fields.chat_id = args.chat_id;
        if (args.caption !== undefined && args.caption !== null && args.caption !== "") fields.caption = args.caption;
        return flattenMessage(await telegramMultipartRequest(opts, "sendDocument", fields, "document", resolved.buffer, resolved.fileName, resolved.mimeType));
      }
  
      const body = {};
      if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
      if (resolved && resolved.value) body.document = resolved.value;
      else if (args.document !== undefined && args.document !== null && args.document !== "") body.document = args.document;
      if (args.caption !== undefined && args.caption !== null && args.caption !== "") body.caption = args.caption;
      return flattenMessage(await telegramRequest(opts, "sendDocument", body));
    }
};
