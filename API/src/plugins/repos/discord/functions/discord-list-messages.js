const { handlers } = require("./utils");

module.exports = {
  async discord_list_messages(node, msg, inputs, opts) {
    return handlers.discord_list_messages(node, msg, inputs, opts);
  }
};
