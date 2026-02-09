module.exports = {
  async twilio_send_sms(node, msg, inputs, opts) {
    const { twilioRequest } = require("../utils").utils;
    const args = node.args || {};
    const body = {};
    if (args.to !== undefined && args.to !== null && args.to !== "") body.To = args.to;
    if (args.from !== undefined && args.from !== null && args.from !== "") body.From = args.from;
    if (args.body !== undefined && args.body !== null && args.body !== "") body.Body = args.body;
    if (args.status_callback !== undefined && args.status_callback !== null && args.status_callback !== "") body.StatusCallback = args.status_callback;
    const result = await twilioRequest(opts, "POST", "/Messages", body);
    return result;
  },

  async twilio_list_sms(node, msg, inputs, opts) {
    const { twilioRequest } = require("../utils").utils;
    const args = node.args || {};
    const params = [];
    if (args.to !== undefined && args.to !== null && args.to !== "") params.push(`To=${encodeURIComponent(args.to)}`);
    if (args.from !== undefined && args.from !== null && args.from !== "") params.push(`From=${encodeURIComponent(args.from)}`);
    if (args.page_size !== undefined && args.page_size !== null && args.page_size !== "") params.push(`PageSize=${Number(args.page_size)}`);
    const qs = params.length ? `?${params.join("&")}` : "";
    const result = await twilioRequest(opts, "GET", `/Messages${qs}`);
    return result;
  }
};
