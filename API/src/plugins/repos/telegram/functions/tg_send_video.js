
module.exports = {
  async tg_send_video(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { telegramRequest, telegramMultipartRequest, resolveFileArg } = require("./utils").utils;
      const args = inputs || {};
  
      // Resolve file input (fileRef object, URL string, or file_id)
      const resolved = await resolveFileArg(args.video, opts);
  
      if (resolved && resolved.buffer) {
        // Upload via multipart/form-data
        const fields = {};
        if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") fields.chat_id = args.chat_id;
        if (args.caption !== undefined && args.caption !== null && args.caption !== "") fields.caption = args.caption;
        if (args.duration !== undefined && args.duration !== null && args.duration !== "") fields.duration = String(Number(args.duration));
        if (args.width !== undefined && args.width !== null && args.width !== "") fields.width = String(Number(args.width));
        if (args.height !== undefined && args.height !== null && args.height !== "") fields.height = String(Number(args.height));
        return telegramMultipartRequest(opts, "sendVideo", fields, "video", resolved.buffer, resolved.fileName, resolved.mimeType);
      }
  
      // URL or file_id: use JSON body
      const body = {};
      if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
      if (resolved && resolved.value) body.video = resolved.value;
      else if (args.video !== undefined && args.video !== null && args.video !== "") body.video = args.video;
      if (args.caption !== undefined && args.caption !== null && args.caption !== "") body.caption = args.caption;
      if (args.duration !== undefined && args.duration !== null && args.duration !== "") body.duration = Number(args.duration);
      if (args.width !== undefined && args.width !== null && args.width !== "") body.width = Number(args.width);
      if (args.height !== undefined && args.height !== null && args.height !== "") body.height = Number(args.height);
      return telegramRequest(opts, "sendVideo", body);
    }
};
