module.exports = {
  async twilio_get_message(node, msg, inputs, opts) {
    const { twilioRequest } = require("../utils").utils;
    const args = node.args || {};
    const messageSid = args.message_sid || "";
    const result = await twilioRequest(opts, "GET", `/Messages/${messageSid}`);
    return result;
  },

  async twilio_delete_message(node, msg, inputs, opts) {
    const { twilioRequest } = require("../utils").utils;
    const args = node.args || {};
    const messageSid = args.message_sid || "";
    const result = await twilioRequest(opts, "DELETE", `/Messages/${messageSid}`);
    return result;
  }
};
