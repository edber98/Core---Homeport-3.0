module.exports = {
  async wa_get_business_profile(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { whatsappRequest, getPhoneNumberId } = require("../utils").utils;
    const args = node.args || {};
    const phoneNumberId = getPhoneNumberId(opts);
    const result = await whatsappRequest(opts, "GET", `/${phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`);
    return result;
  },

  async wa_update_business_profile(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { whatsappRequest, getPhoneNumberId } = require("../utils").utils;
    const args = node.args || {};
    const phoneNumberId = getPhoneNumberId(opts);
    const body = { messaging_product: "whatsapp" };
    if (args.about !== undefined && args.about !== null && args.about !== "") body.about = args.about;
    if (args.address !== undefined && args.address !== null && args.address !== "") body.address = args.address;
    if (args.description !== undefined && args.description !== null && args.description !== "") body.description = args.description;
    if (args.email !== undefined && args.email !== null && args.email !== "") body.email = args.email;
    if (args.websites_json !== undefined && args.websites_json !== null && args.websites_json !== "") {
      try { body.websites = JSON.parse(args.websites_json); } catch (e) { /* ignore */ }
    }
    const result = await whatsappRequest(opts, "POST", `/${phoneNumberId}/whatsapp_business_profile`, body);
    return result;
  }
};
