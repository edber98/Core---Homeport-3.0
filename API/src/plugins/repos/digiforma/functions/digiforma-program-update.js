const { handlers } = require("./utils");

module.exports = {
  async digiforma_program_update(node, msg, inputs, opts) {
    return handlers.digiforma_program_update(node, msg, inputs, opts);
  }
};
