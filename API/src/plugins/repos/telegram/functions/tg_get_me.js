
module.exports = {
  async tg_get_me(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { telegramRequest } = require("./utils").utils;
      const args = inputs || {};
      const body = {};
      const result = await telegramRequest(opts, "getMe", body);
      return result;
    }
};
