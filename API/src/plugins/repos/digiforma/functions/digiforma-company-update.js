const { handlers } = require("./utils");

module.exports = {
  async digiforma_company_update(node, msg, inputs, opts) {
    return handlers.digiforma_company_update(node, msg, inputs, opts);
  }
};
