module.exports = {
  async wa_send_location(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { whatsappRequest, getPhoneNumberId } = require("./utils").utils;
      const args = inputs || {};
      const phoneNumberId = getPhoneNumberId(opts);
      const location = {};
      if (args.latitude !== undefined && args.latitude !== null && args.latitude !== "") location.latitude = Number(args.latitude);
      if (args.longitude !== undefined && args.longitude !== null && args.longitude !== "") location.longitude = Number(args.longitude);
      if (args.name !== undefined && args.name !== null && args.name !== "") location.name = args.name;
      if (args.address !== undefined && args.address !== null && args.address !== "") location.address = args.address;
      const body = {
        messaging_product: "whatsapp",
        to: args.to || "",
        type: "location",
        location
      };
      const result = await whatsappRequest(opts, "POST", `/${phoneNumberId}/messages`, body);
      if (!result.ok) return result;
      return { ok: true, message_id: (result.messages && result.messages[0] && result.messages[0].id) || "", to: args.to || "", type: "location", status: "sent" };
    }
};
