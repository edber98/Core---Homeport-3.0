
module.exports = {
  async tg_send_venue(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { telegramRequest } = require("./utils").utils;
      const args = inputs || {};
      const body = {};
      if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
      if (args.latitude !== undefined && args.latitude !== null && args.latitude !== "") body.latitude = Number(args.latitude);
      if (args.longitude !== undefined && args.longitude !== null && args.longitude !== "") body.longitude = Number(args.longitude);
      if (args.title !== undefined && args.title !== null && args.title !== "") body.title = args.title;
      if (args.address !== undefined && args.address !== null && args.address !== "") body.address = args.address;
      const result = await telegramRequest(opts, "sendVenue", body);
      return result;
    }
};
