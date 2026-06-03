const { handlers } = require("./utils");

module.exports = {
  async digiforma_program_get(node, msg, inputs, opts) {
    return handlers.digiforma_program_get(node, msg, inputs, opts);
  }
};
