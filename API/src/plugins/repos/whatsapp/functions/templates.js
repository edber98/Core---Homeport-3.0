module.exports = {
  async wa_list_templates(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { whatsappRequest } = require("../utils").utils;
    const args = inputs || {};
    const businessId = args.business_id || "";
    const params = [];
    if (args.limit !== undefined && args.limit !== null && args.limit !== "") params.push(`limit=${Number(args.limit)}`);
    const qs = params.length ? `?${params.join("&")}` : "";
    const result = await whatsappRequest(opts, "GET", `/${businessId}/message_templates${qs}`);
    return result;
  }
};
