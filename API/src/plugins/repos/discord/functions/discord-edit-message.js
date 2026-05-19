const { handlers } = require("./utils");

module.exports = {
  async discord_edit_message(node, msg, inputs, opts) {
    return handlers.discord_edit_message(node, msg, inputs, opts);
  }
};
