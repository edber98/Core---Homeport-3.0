const { handlers } = require("./utils");

module.exports = {
  async discord_create_thread(node, msg, inputs, opts) {
    return handlers.discord_create_thread(node, msg, inputs, opts);
  }
};
