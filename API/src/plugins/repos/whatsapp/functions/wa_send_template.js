module.exports = {
  async wa_send_template(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { whatsappRequest, getPhoneNumberId } = require("./utils").utils;
      const args = inputs || {};
      const phoneNumberId = getPhoneNumberId(opts);
      const template = {
        name: args.template_name || "",
        language: { code: args.language_code || "fr" }
      };
      if (args.components_json !== undefined && args.components_json !== null && args.components_json !== "") {
        try { template.components = JSON.parse(args.components_json); } catch (e) { /* ignore */ }
      }
      const body = {
        messaging_product: "whatsapp",
        to: args.to || "",
        type: "template",
        template
      };
      const result = await whatsappRequest(opts, "POST", `/${phoneNumberId}/messages`, body);
      if (!result.ok) return result;
      return { ok: true, message_id: (result.messages && result.messages[0] && result.messages[0].id) || "", to: args.to || "", type: "template", status: "sent" };
    }
};
