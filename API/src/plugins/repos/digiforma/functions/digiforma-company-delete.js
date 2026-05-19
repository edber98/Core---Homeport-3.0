const { handlers } = require("./utils");

module.exports = {
  async digiforma_company_delete(node, msg, inputs, opts) {
    return handlers.digiforma_company_delete(node, msg, inputs, opts);
  }
};
