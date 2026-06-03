module.exports = {
  async twilio_send_sms(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { twilioRequest } = require("./utils").utils;
      const args = inputs || {};
      const body = {};
      if (args.to !== undefined && args.to !== null && args.to !== "") body.To = args.to;
      if (args.from !== undefined && args.from !== null && args.from !== "") body.From = args.from;
      if (args.body !== undefined && args.body !== null && args.body !== "") body.Body = args.body;
      if (args.status_callback !== undefined && args.status_callback !== null && args.status_callback !== "") body.StatusCallback = args.status_callback;
      const result = await twilioRequest(opts, "POST", "/Messages", body);
      return result;
    }
};
