module.exports = {
  async tg_get_me(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { telegramRequest } = require("../utils").utils;
    const args = inputs || {};
    const body = {};
    const result = await telegramRequest(opts, "getMe", body);
    return result;
  },

  async tg_get_updates(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { telegramRequest } = require("../utils").utils;
    const args = inputs || {};
    const body = {};
    if (args.offset !== undefined && args.offset !== null && args.offset !== "") body.offset = Number(args.offset);
    if (args.limit !== undefined && args.limit !== null && args.limit !== "") body.limit = Number(args.limit);
    if (args.timeout !== undefined && args.timeout !== null && args.timeout !== "") body.timeout = Number(args.timeout);
    if (args.allowed_updates !== undefined && args.allowed_updates !== null && args.allowed_updates !== "") body.allowed_updates = args.allowed_updates;
    const result = await telegramRequest(opts, "getUpdates", body);
    return result;
  },

  async tg_set_webhook(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { telegramRequest } = require("../utils").utils;
    const args = inputs || {};
    const body = {};
    if (args.url !== undefined && args.url !== null && args.url !== "") body.url = args.url;
    if (args.allowed_updates !== undefined && args.allowed_updates !== null && args.allowed_updates !== "") body.allowed_updates = args.allowed_updates;
    if (args.max_connections !== undefined && args.max_connections !== null && args.max_connections !== "") body.max_connections = Number(args.max_connections);
    if (args.secret_token !== undefined && args.secret_token !== null && args.secret_token !== "") body.secret_token = args.secret_token;
    const result = await telegramRequest(opts, "setWebhook", body);
    return result;
  }
};
