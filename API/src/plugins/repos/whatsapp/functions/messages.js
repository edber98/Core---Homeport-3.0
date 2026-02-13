module.exports = {
  async wa_send_text(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { whatsappRequest, getPhoneNumberId } = require("../utils").utils;
    const args = node.args || {};
    const phoneNumberId = getPhoneNumberId(opts);
    const body = {
      messaging_product: "whatsapp",
      to: args.to || "",
      type: "text",
      text: { body: args.text || "" }
    };
    const result = await whatsappRequest(opts, "POST", `/${phoneNumberId}/messages`, body);
    return result;
  },

  async wa_send_template(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { whatsappRequest, getPhoneNumberId } = require("../utils").utils;
    const args = node.args || {};
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
    return result;
  },

  async wa_send_image(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { whatsappRequest, getPhoneNumberId } = require("../utils").utils;
    const args = node.args || {};
    const phoneNumberId = getPhoneNumberId(opts);
    const image = {};
    if (args.image_url !== undefined && args.image_url !== null && args.image_url !== "") image.link = args.image_url;
    if (args.image_id !== undefined && args.image_id !== null && args.image_id !== "") image.id = args.image_id;
    if (args.caption !== undefined && args.caption !== null && args.caption !== "") image.caption = args.caption;
    const body = {
      messaging_product: "whatsapp",
      to: args.to || "",
      type: "image",
      image
    };
    const result = await whatsappRequest(opts, "POST", `/${phoneNumberId}/messages`, body);
    return result;
  },

  async wa_send_document(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { whatsappRequest, getPhoneNumberId } = require("../utils").utils;
    const args = node.args || {};
    const phoneNumberId = getPhoneNumberId(opts);
    const document = {};
    if (args.document_url !== undefined && args.document_url !== null && args.document_url !== "") document.link = args.document_url;
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
    return result;
  },

  async wa_send_location(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { whatsappRequest, getPhoneNumberId } = require("../utils").utils;
    const args = node.args || {};
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
    return result;
  },

  async wa_send_contact(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { whatsappRequest, getPhoneNumberId } = require("../utils").utils;
    const args = node.args || {};
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
    return result;
  },

  async wa_mark_read(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { whatsappRequest, getPhoneNumberId } = require("../utils").utils;
    const args = node.args || {};
    const phoneNumberId = getPhoneNumberId(opts);
    const body = {
      messaging_product: "whatsapp",
      status: "read",
      message_id: args.message_id || ""
    };
    const result = await whatsappRequest(opts, "POST", `/${phoneNumberId}/messages`, body);
    return result;
  }
};
