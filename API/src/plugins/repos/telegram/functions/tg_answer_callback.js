
module.exports = {
  async tg_answer_callback(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { telegramRequest } = require("./utils").utils;
      const args = inputs || {};
      const body = {};
      if (args.callback_query_id !== undefined && args.callback_query_id !== null && args.callback_query_id !== "") body.callback_query_id = args.callback_query_id;
      if (args.text !== undefined && args.text !== null && args.text !== "") body.text = args.text;
      if (args.show_alert !== undefined) body.show_alert = !!args.show_alert;
      const result = await telegramRequest(opts, "answerCallbackQuery", body);
      return result;
    }
};
