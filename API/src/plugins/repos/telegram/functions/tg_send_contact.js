
module.exports = {
  async tg_send_contact(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { telegramRequest } = require("./utils").utils;
      const args = inputs || {};
      const body = {};
      if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
      if (args.phone_number !== undefined && args.phone_number !== null && args.phone_number !== "") body.phone_number = args.phone_number;
      if (args.first_name !== undefined && args.first_name !== null && args.first_name !== "") body.first_name = args.first_name;
      if (args.last_name !== undefined && args.last_name !== null && args.last_name !== "") body.last_name = args.last_name;
      const result = await telegramRequest(opts, "sendContact", body);
      return result;
    }
};
