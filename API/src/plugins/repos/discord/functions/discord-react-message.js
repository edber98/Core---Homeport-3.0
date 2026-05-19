const { handlers } = require("./utils");

module.exports = {
  async discord_react_message(node, msg, inputs, opts) {
    return handlers.discord_react_message(node, msg, inputs, opts);
  }
};
