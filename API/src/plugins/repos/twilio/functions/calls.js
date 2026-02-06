module.exports = {
  async twilio_create_call(node, msg, inputs, opts) {
    const { twilioRequest } = require("../utils").utils;
    const args = node.args || {};
    const body = {};
    if (args.to !== undefined && args.to !== null && args.to !== "") body.To = args.to;
    if (args.from !== undefined && args.from !== null && args.from !== "") body.From = args.from;
    if (args.url !== undefined && args.url !== null && args.url !== "") body.Url = args.url;
    if (args.twiml !== undefined && args.twiml !== null && args.twiml !== "") body.Twiml = args.twiml;
    if (args.status_callback !== undefined && args.status_callback !== null && args.status_callback !== "") body.StatusCallback = args.status_callback;
    const result = await twilioRequest(opts, "POST", "/Calls", body);
    return result;
  },

  async twilio_get_call(node, msg, inputs, opts) {
    const { twilioRequest } = require("../utils").utils;
    const args = node.args || {};
    const callSid = args.call_sid || "";
    const result = await twilioRequest(opts, "GET", `/Calls/${callSid}`);
    return result;
  },

  async twilio_list_calls(node, msg, inputs, opts) {
    const { twilioRequest } = require("../utils").utils;
    const args = node.args || {};
    const params = [];
    if (args.to !== undefined && args.to !== null && args.to !== "") params.push(`To=${encodeURIComponent(args.to)}`);
    if (args.from !== undefined && args.from !== null && args.from !== "") params.push(`From=${encodeURIComponent(args.from)}`);
    if (args.status !== undefined && args.status !== null && args.status !== "") params.push(`Status=${args.status}`);
    if (args.page_size !== undefined && args.page_size !== null && args.page_size !== "") params.push(`PageSize=${Number(args.page_size)}`);
    const qs = params.length ? `?${params.join("&")}` : "";
    const result = await twilioRequest(opts, "GET", `/Calls${qs}`);
    return result;
  }
};
