module.exports = {
  async wa_list_phone_numbers(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { whatsappRequest } = require("./utils").utils;
      const args = inputs || {};
      const businessId = args.business_id || "";
      const result = await whatsappRequest(opts, "GET", `/${businessId}/phone_numbers`);
      return result;
    }
};
