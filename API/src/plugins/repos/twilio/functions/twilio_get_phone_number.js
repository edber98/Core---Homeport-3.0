module.exports = {
  async twilio_get_phone_number(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { twilioRequest } = require("./utils").utils;
      const args = inputs || {};
      const phoneSid = args.phone_sid || "";
      const result = await twilioRequest(opts, "GET", `/IncomingPhoneNumbers/${phoneSid}`);
      return result;
    }
};
