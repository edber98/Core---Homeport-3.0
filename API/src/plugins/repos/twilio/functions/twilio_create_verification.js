module.exports = {
  async twilio_create_verification(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { twilioVerifyRequest } = require("./utils").utils;
      const args = inputs || {};
      const serviceSid = args.service_sid || "";
      const body = {};
      if (args.to !== undefined && args.to !== null && args.to !== "") body.To = args.to;
      if (args.channel !== undefined && args.channel !== null && args.channel !== "") body.Channel = args.channel;
      const result = await twilioVerifyRequest(opts, "POST", `/Services/${serviceSid}/Verifications`, body);
      return result;
    }
};
