module.exports = {
  async twilio_get_call(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { twilioRequest } = require("./utils").utils;
      const args = inputs || {};
      const callSid = args.call_sid || "";
      const result = await twilioRequest(opts, "GET", `/Calls/${callSid}`);
      return result;
    }
};
