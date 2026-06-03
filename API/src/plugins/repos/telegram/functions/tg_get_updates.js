
module.exports = {
  async tg_get_updates(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { telegramRequest } = require("./utils").utils;
      const args = inputs || {};
      const body = {};
      if (args.offset !== undefined && args.offset !== null && args.offset !== "") body.offset = Number(args.offset);
      if (args.limit !== undefined && args.limit !== null && args.limit !== "") body.limit = Number(args.limit);
      if (args.timeout !== undefined && args.timeout !== null && args.timeout !== "") body.timeout = Number(args.timeout);
      if (args.allowed_updates !== undefined && args.allowed_updates !== null && args.allowed_updates !== "") body.allowed_updates = args.allowed_updates;
      const result = await telegramRequest(opts, "getUpdates", body);
      return result;
    }
};
