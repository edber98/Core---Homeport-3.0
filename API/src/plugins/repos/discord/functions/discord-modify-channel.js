const { handlers } = require("./utils");

module.exports = {
  async discord_modify_channel(node, msg, inputs, opts) {
    return handlers.discord_modify_channel(node, msg, inputs, opts);
  }
};
