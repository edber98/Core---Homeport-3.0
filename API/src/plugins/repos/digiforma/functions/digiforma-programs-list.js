const { handlers } = require("./utils");

module.exports = {
  async digiforma_programs_list(node, msg, inputs, opts) {
    return handlers.digiforma_programs_list(node, msg, inputs, opts);
  }
};
