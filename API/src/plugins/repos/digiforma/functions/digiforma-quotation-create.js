const { handlers } = require("./utils");

module.exports = {
  async digiforma_quotation_create(node, msg, inputs, opts) {
    return handlers.digiforma_quotation_create(node, msg, inputs, opts);
  }
};
