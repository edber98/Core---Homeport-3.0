
module.exports = {
  async tg_send_poll(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { telegramRequest } = require("./utils").utils;
      const args = inputs || {};
      const body = {};
      if (args.chat_id) body.chat_id = args.chat_id;
      if (args.question) body.question = args.question;
      if (args.pollOptions) {
        try { body.options = JSON.parse(args.pollOptions); }
        catch (e) { return { ok: false, error: "JSON invalide pour pollOptions: " + e.message }; }
      }
      if (args.is_anonymous !== undefined) body.is_anonymous = !!args.is_anonymous;
      if (args.type) body.type = args.type;
      if (args.allows_multiple_answers !== undefined) body.allows_multiple_answers = !!args.allows_multiple_answers;
      const result = await telegramRequest(opts, "sendPoll", body);
      return result;
    }
};
