const { handlers } = require("./utils");

module.exports = {
  async digiforma_company_create(node, msg, inputs, opts) {
    return handlers.digiforma_company_create(node, msg, inputs, opts);
  }
};
