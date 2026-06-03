const { handlers } = require("./utils");

module.exports = {
  async digiforma_trainee_update(node, msg, inputs, opts) {
    return handlers.digiforma_trainee_update(node, msg, inputs, opts);
  }
};
