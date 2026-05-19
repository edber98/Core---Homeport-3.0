const { handlers } = require("./utils");

module.exports = {
  async digiforma_invoice_get(node, msg, inputs, opts) {
    return handlers.digiforma_invoice_get(node, msg, inputs, opts);
  }
};
