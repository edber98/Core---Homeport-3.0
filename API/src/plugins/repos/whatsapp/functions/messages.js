module.exports = {
  async wa_send_text(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { whatsappRequest, getPhoneNumberId } = require("../utils").utils;
    const args = inputs || {};
    const phoneNumberId = getPhoneNumberId(opts);
    const body = {
      messaging_product: "whatsapp",
      to: args.to || "",
      type: "text",
      text: { body: args.text || "" }
    };
    const result = await whatsappRequest(opts, "POST", `/${phoneNumberId}/messages`, body);
    if (!result.ok) return result;
    return { ok: true, message_id: (result.messages && result.messages[0] && result.messages[0].id) || "", to: args.to || "", type: "text", status: "sent" };
  },

  async wa_send_template(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { whatsappRequest, getPhoneNumberId } = require("../utils").utils;
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
  },

  async wa_send_image(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { whatsappRequest, getPhoneNumberId, resolveFileArg, uploadMediaBuffer } = require("../utils").utils;
    const args = inputs || {};
    const phoneNumberId = getPhoneNumberId(opts);
    const image = {};

    // Resolve fileRef or URL → upload to WhatsApp media, then use media id
    const fileData = await resolveFileArg(args.image_url, opts);
    if (fileData) {
      log('Téléversement de l\'image vers WhatsApp...');
      const media = await uploadMediaBuffer(opts, fileData.buffer, fileData.mimeType, fileData.name);
      image.id = media.id;
    } else if (args.image_url !== undefined && args.image_url !== null && args.image_url !== "") {
      image.link = args.image_url;
    }

    if (args.image_id !== undefined && args.image_id !== null && args.image_id !== "") image.id = args.image_id;
    if (args.caption !== undefined && args.caption !== null && args.caption !== "") image.caption = args.caption;
    const body = {
      messaging_product: "whatsapp",
      to: args.to || "",
      type: "image",
      image
    };
    const result = await whatsappRequest(opts, "POST", `/${phoneNumberId}/messages`, body);
    if (!result.ok) return result;
    return { ok: true, message_id: (result.messages && result.messages[0] && result.messages[0].id) || "", to: args.to || "", type: "image", status: "sent" };
  },

  async wa_send_document(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { whatsappRequest, getPhoneNumberId, resolveFileArg, uploadMediaBuffer } = require("../utils").utils;
    const args = inputs || {};
    const phoneNumberId = getPhoneNumberId(opts);
    const document = {};

    // Resolve fileRef or URL → upload to WhatsApp media, then use media id
    const fileData = await resolveFileArg(args.document_url, opts);
    if (fileData) {
      log('Téléversement du document vers WhatsApp...');
      const media = await uploadMediaBuffer(opts, fileData.buffer, fileData.mimeType, fileData.name);
      document.id = media.id;
      if (!args.filename) document.filename = fileData.name;
    } else if (args.document_url !== undefined && args.document_url !== null && args.document_url !== "") {
      document.link = args.document_url;
    }

    if (args.document_id !== undefined && args.document_id !== null && args.document_id !== "") document.id = args.document_id;
    if (args.caption !== undefined && args.caption !== null && args.caption !== "") document.caption = args.caption;
    if (args.filename !== undefined && args.filename !== null && args.filename !== "") document.filename = args.filename;
    const body = {
      messaging_product: "whatsapp",
      to: args.to || "",
      type: "document",
      document
    };
    const result = await whatsappRequest(opts, "POST", `/${phoneNumberId}/messages`, body);
    if (!result.ok) return result;
    return { ok: true, message_id: (result.messages && result.messages[0] && result.messages[0].id) || "", to: args.to || "", type: "document", status: "sent" };
  },

  async wa_send_location(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { whatsappRequest, getPhoneNumberId } = require("../utils").utils;
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
  },

  async wa_send_contact(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { whatsappRequest, getPhoneNumberId } = require("../utils").utils;
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
  },

  async wa_mark_read(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { whatsappRequest, getPhoneNumberId } = require("../utils").utils;
    const args = inputs || {};
    const phoneNumberId = getPhoneNumberId(opts);
    const body = {
      messaging_product: "whatsapp",
      status: "read",
      message_id: args.message_id || ""
    };
    const result = await whatsappRequest(opts, "POST", `/${phoneNumberId}/messages`, body);
    if (!result.ok) return result;
    return { ok: true, status: result.success ? "success" : "unknown", message: "Message marqué comme lu" };
  }
};
