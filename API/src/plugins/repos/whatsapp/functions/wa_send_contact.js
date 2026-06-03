module.exports = {
  async wa_send_contact(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { whatsappRequest, getPhoneNumberId } = require("./utils").utils;
      const args = inputs || {};
      const phoneNumberId = getPhoneNumberId(opts);
      let contacts = [];
      if (args.contacts_json !== undefined && args.contacts_json !== null && args.contacts_json !== "") {
        try { contacts = JSON.parse(args.contacts_json); } catch (e) { /* ignore */ }
      } else {
        contacts = [{
          name: { formatted_name: args.formatted_name || "" },
          phones: [{ phone: args.phone || "" }]
        }];
      }
      const body = {
        messaging_product: "whatsapp",
        to: args.to || "",
        type: "contacts",
        contacts
      };
      const result = await whatsappRequest(opts, "POST", `/${phoneNumberId}/messages`, body);
      if (!result.ok) return result;
      return { ok: true, message_id: (result.messages && result.messages[0] && result.messages[0].id) || "", to: args.to || "", type: "contacts", status: "sent" };
    }
};
