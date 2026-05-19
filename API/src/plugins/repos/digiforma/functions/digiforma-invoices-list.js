const { handlers } = require("./utils");

module.exports = {
  async digiforma_invoices_list(node, msg, inputs, opts) {
    return handlers.digiforma_invoices_list(node, msg, inputs, opts);
  }
};
