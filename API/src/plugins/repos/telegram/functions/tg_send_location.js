
module.exports = {
  async tg_send_location(node, msg, inputs, opts) {
      const { telegramRequest } = require("./utils").utils;
      const args = inputs || {};
      const body = {};
      if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
      if (args.latitude !== undefined && args.latitude !== null && args.latitude !== "") body.latitude = Number(args.latitude);
      if (args.longitude !== undefined && args.longitude !== null && args.longitude !== "") body.longitude = Number(args.longitude);
      if (args.live_period !== undefined && args.live_period !== null && args.live_period !== "") body.live_period = Number(args.live_period);
      return telegramRequest(opts, "sendLocation", body);
    }
};
