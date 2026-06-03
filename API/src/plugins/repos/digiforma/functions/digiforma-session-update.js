const { handlers } = require("./utils");

module.exports = {
  async digiforma_session_update(node, msg, inputs, opts) {
    return handlers.digiforma_session_update(node, msg, inputs, opts);
  }
};
