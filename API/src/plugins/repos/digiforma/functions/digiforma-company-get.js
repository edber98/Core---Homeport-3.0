const { handlers } = require("./utils");

module.exports = {
  async digiforma_company_get(node, msg, inputs, opts) {
    return handlers.digiforma_company_get(node, msg, inputs, opts);
  }
};
