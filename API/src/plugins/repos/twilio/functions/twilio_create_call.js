module.exports = {
  async twilio_create_call(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { twilioRequest } = require("./utils").utils;
      const args = inputs || {};
      const body = {};
      if (args.to !== undefined && args.to !== null && args.to !== "") body.To = args.to;
      if (args.from !== undefined && args.from !== null && args.from !== "") body.From = args.from;
      if (args.url !== undefined && args.url !== null && args.url !== "") body.Url = args.url;
      if (args.twiml !== undefined && args.twiml !== null && args.twiml !== "") body.Twiml = args.twiml;
      if (args.status_callback !== undefined && args.status_callback !== null && args.status_callback !== "") body.StatusCallback = args.status_callback;
      const result = await twilioRequest(opts, "POST", "/Calls", body);
      return result;
    }
};
