module.exports = {
  async twilio_check_verification(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { twilioVerifyRequest } = require("./utils").utils;
      const args = inputs || {};
      const serviceSid = args.service_sid || "";
      const body = {};
      if (args.to !== undefined && args.to !== null && args.to !== "") body.To = args.to;
      if (args.code !== undefined && args.code !== null && args.code !== "") body.Code = args.code;
      const result = await twilioVerifyRequest(opts, "POST", `/Services/${serviceSid}/VerificationCheck`, body);
      return result;
    }
};
