module.exports = {
  async twilio_create_verify_service(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { twilioVerifyRequest } = require("./utils").utils;
      const args = inputs || {};
      const body = {};
      if (args.friendly_name !== undefined && args.friendly_name !== null && args.friendly_name !== "") body.FriendlyName = args.friendly_name;
      if (args.code_length !== undefined && args.code_length !== null && args.code_length !== "") body.CodeLength = Number(args.code_length);
      const result = await twilioVerifyRequest(opts, "POST", "/Services", body);
      return result;
    }
};
