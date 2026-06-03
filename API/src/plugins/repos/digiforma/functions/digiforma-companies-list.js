const { handlers } = require("./utils");

module.exports = {
  async digiforma_companies_list(node, msg, inputs, opts) {
    return handlers.digiforma_companies_list(node, msg, inputs, opts);
  }
};
