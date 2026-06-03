module.exports = {
  async twilio_delete_message(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { twilioRequest } = require("./utils").utils;
      const args = inputs || {};
      const messageSid = args.message_sid || "";
      const result = await twilioRequest(opts, "DELETE", `/Messages/${messageSid}`);
      return result;
    }
};
