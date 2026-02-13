module.exports = {
  async tg_send_poll(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { telegramRequest } = require("../utils").utils;
    const args = node.args || {};
    const body = {};
    if (args.chat_id) body.chat_id = args.chat_id;
    if (args.question) body.question = args.question;
    if (args.options) {
      try { body.options = JSON.parse(args.options); }
      catch (e) { return { ok: false, error: "JSON invalide pour les options: " + e.message }; }
    }
    if (args.is_anonymous !== undefined) body.is_anonymous = !!args.is_anonymous;
    if (args.type) body.type = args.type;
    if (args.allows_multiple_answers !== undefined) body.allows_multiple_answers = !!args.allows_multiple_answers;
    const result = await telegramRequest(opts, "sendPoll", body);
    return result;
  },

  async tg_send_contact(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { telegramRequest } = require("../utils").utils;
    const args = node.args || {};
    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    if (args.phone_number !== undefined && args.phone_number !== null && args.phone_number !== "") body.phone_number = args.phone_number;
    if (args.first_name !== undefined && args.first_name !== null && args.first_name !== "") body.first_name = args.first_name;
    if (args.last_name !== undefined && args.last_name !== null && args.last_name !== "") body.last_name = args.last_name;
    const result = await telegramRequest(opts, "sendContact", body);
    return result;
  },

  async tg_send_venue(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { telegramRequest } = require("../utils").utils;
    const args = node.args || {};
    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    if (args.latitude !== undefined && args.latitude !== null && args.latitude !== "") body.latitude = Number(args.latitude);
    if (args.longitude !== undefined && args.longitude !== null && args.longitude !== "") body.longitude = Number(args.longitude);
    if (args.title !== undefined && args.title !== null && args.title !== "") body.title = args.title;
    if (args.address !== undefined && args.address !== null && args.address !== "") body.address = args.address;
    const result = await telegramRequest(opts, "sendVenue", body);
    return result;
  }
};
