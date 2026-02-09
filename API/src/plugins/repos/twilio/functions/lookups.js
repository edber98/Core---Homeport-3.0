module.exports = {
  async twilio_phone_lookup(node, msg, inputs, opts) {
    const { twilioLookupRequest } = require("../utils").utils;
    const args = node.args || {};
    const phoneNumber = encodeURIComponent(args.phone_number || "");
    const params = [];
    if (args.fields !== undefined && args.fields !== null && args.fields !== "") params.push(`Fields=${args.fields}`);
    const qs = params.length ? `?${params.join("&")}` : "";
    const result = await twilioLookupRequest(opts, `/PhoneNumbers/${phoneNumber}${qs}`);
    return result;
  }
};
