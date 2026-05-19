const { handlers } = require("./utils");

module.exports = {
  async discord_add_role_to_member(node, msg, inputs, opts) {
    return handlers.discord_add_role_to_member(node, msg, inputs, opts);
  }
};
