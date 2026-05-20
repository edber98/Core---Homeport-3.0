module.exports = {
  async twilio_list_phone_numbers(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { twilioRequest } = require("./utils").utils;
      const args = inputs || {};
      const params = [];
      if (args.page_size !== undefined && args.page_size !== null && args.page_size !== "") params.push(`PageSize=${Number(args.page_size)}`);
      const qs = params.length ? `?${params.join("&")}` : "";
      const result = await twilioRequest(opts, "GET", `/IncomingPhoneNumbers${qs}`);
      return result;
    }
};
