const { handlers } = require("./utils");

module.exports = {
  async discord_delete_channel(node, msg, inputs, opts) {
    return handlers.discord_delete_channel(node, msg, inputs, opts);
  }
};
