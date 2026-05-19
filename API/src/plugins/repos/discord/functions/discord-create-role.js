const { handlers } = require("./utils");

module.exports = {
  async discord_create_role(node, msg, inputs, opts) {
    return handlers.discord_create_role(node, msg, inputs, opts);
  }
};
