const { handlers } = require("./utils");

module.exports = {
  async discord_list_threads(node, msg, inputs, opts) {
    return handlers.discord_list_threads(node, msg, inputs, opts);
  }
};
