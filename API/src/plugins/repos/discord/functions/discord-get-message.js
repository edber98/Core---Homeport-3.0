const { handlers } = require("./utils");

module.exports = {
  async discord_get_message(node, msg, inputs, opts) {
    return handlers.discord_get_message(node, msg, inputs, opts);
  }
};
