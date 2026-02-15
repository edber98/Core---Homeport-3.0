module.exports = {
  async twilio_create_verify_service(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { twilioVerifyRequest } = require("../utils").utils;
    const args = inputs || {};
    const body = {};
    if (args.friendly_name !== undefined && args.friendly_name !== null && args.friendly_name !== "") body.FriendlyName = args.friendly_name;
    if (args.code_length !== undefined && args.code_length !== null && args.code_length !== "") body.CodeLength = Number(args.code_length);
    const result = await twilioVerifyRequest(opts, "POST", "/Services", body);
    return result;
  },

  async twilio_create_verification(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { twilioVerifyRequest } = require("../utils").utils;
    const args = inputs || {};
    const serviceSid = args.service_sid || "";
    const body = {};
    if (args.to !== undefined && args.to !== null && args.to !== "") body.To = args.to;
    if (args.channel !== undefined && args.channel !== null && args.channel !== "") body.Channel = args.channel;
    const result = await twilioVerifyRequest(opts, "POST", `/Services/${serviceSid}/Verifications`, body);
    return result;
  },

  async twilio_check_verification(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { twilioVerifyRequest } = require("../utils").utils;
    const args = inputs || {};
    const serviceSid = args.service_sid || "";
    const body = {};
    if (args.to !== undefined && args.to !== null && args.to !== "") body.To = args.to;
    if (args.code !== undefined && args.code !== null && args.code !== "") body.Code = args.code;
    const result = await twilioVerifyRequest(opts, "POST", `/Services/${serviceSid}/VerificationCheck`, body);
    return result;
  }
};
