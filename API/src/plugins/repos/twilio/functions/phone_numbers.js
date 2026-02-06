module.exports = {
  async twilio_list_phone_numbers(node, msg, inputs, opts) {
    const { twilioRequest } = require("../utils").utils;
    const args = node.args || {};
    const params = [];
    if (args.page_size !== undefined && args.page_size !== null && args.page_size !== "") params.push(`PageSize=${Number(args.page_size)}`);
    const qs = params.length ? `?${params.join("&")}` : "";
    const result = await twilioRequest(opts, "GET", `/IncomingPhoneNumbers${qs}`);
    return result;
  },

  async twilio_get_phone_number(node, msg, inputs, opts) {
    const { twilioRequest } = require("../utils").utils;
    const args = node.args || {};
    const phoneSid = args.phone_sid || "";
    const result = await twilioRequest(opts, "GET", `/IncomingPhoneNumbers/${phoneSid}`);
    return result;
  }
};
