const { handlers } = require("./utils");

module.exports = {
  async discord_send_message(node, msg, inputs, opts) {
    return handlers.discord_send_message(node, msg, inputs, opts);
  }
};
