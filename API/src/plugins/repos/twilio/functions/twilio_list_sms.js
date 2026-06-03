module.exports = {
  async twilio_list_sms(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { twilioRequest } = require("./utils").utils;
      const args = inputs || {};
      const params = [];
      if (args.to !== undefined && args.to !== null && args.to !== "") params.push(`To=${encodeURIComponent(args.to)}`);
      if (args.from !== undefined && args.from !== null && args.from !== "") params.push(`From=${encodeURIComponent(args.from)}`);
      if (args.page_size !== undefined && args.page_size !== null && args.page_size !== "") params.push(`PageSize=${Number(args.page_size)}`);
      const qs = params.length ? `?${params.join("&")}` : "";
      const result = await twilioRequest(opts, "GET", `/Messages${qs}`);
      return result;
    }
};
