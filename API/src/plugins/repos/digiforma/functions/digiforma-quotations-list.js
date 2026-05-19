const { handlers } = require("./utils");

module.exports = {
  async digiforma_quotations_list(node, msg, inputs, opts) {
    return handlers.digiforma_quotations_list(node, msg, inputs, opts);
  }
};
