const { handlers } = require("./utils");

module.exports = {
  async digiforma_sessions_list(node, msg, inputs, opts) {
    return handlers.digiforma_sessions_list(node, msg, inputs, opts);
  }
};
