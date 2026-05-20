
module.exports = {
  async tg_send_voice(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { telegramRequest, telegramMultipartRequest, resolveFileArg } = require("./utils").utils;
      const args = inputs || {};
  
      // Resolve file input (fileRef object, URL string, or file_id)
      const resolved = await resolveFileArg(args.voice, opts);
  
      if (resolved && resolved.buffer) {
        // Upload via multipart/form-data
        const fields = {};
        if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") fields.chat_id = args.chat_id;
        if (args.caption !== undefined && args.caption !== null && args.caption !== "") fields.caption = args.caption;
        if (args.duration !== undefined && args.duration !== null && args.duration !== "") fields.duration = String(Number(args.duration));
        return telegramMultipartRequest(opts, "sendVoice", fields, "voice", resolved.buffer, resolved.fileName, resolved.mimeType);
      }
  
      // URL or file_id: use JSON body
      const body = {};
      if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
      if (resolved && resolved.value) body.voice = resolved.value;
      else if (args.voice !== undefined && args.voice !== null && args.voice !== "") body.voice = args.voice;
      if (args.caption !== undefined && args.caption !== null && args.caption !== "") body.caption = args.caption;
      if (args.duration !== undefined && args.duration !== null && args.duration !== "") body.duration = Number(args.duration);
      return telegramRequest(opts, "sendVoice", body);
    }
};
