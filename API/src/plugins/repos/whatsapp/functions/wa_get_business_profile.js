module.exports = {
  async wa_get_business_profile(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { whatsappRequest, getPhoneNumberId } = require("./utils").utils;
      const args = inputs || {};
      const phoneNumberId = getPhoneNumberId(opts);
      const result = await whatsappRequest(opts, "GET", `/${phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`);
      if (!result.ok) return result;
      const profile = (Array.isArray(result.data) && result.data[0]) || {};
      return { ok: true, ...profile };
    }
};
