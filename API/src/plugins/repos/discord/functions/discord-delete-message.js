const { handlers } = require("./utils");

module.exports = {
  async discord_delete_message(node, msg, inputs, opts) {
    return handlers.discord_delete_message(node, msg, inputs, opts);
  }
};
