const { utils } = require("./utils");

module.exports = {
  async clay_company_enrich(node, msg, inputs, opts) {
    return utils.run("clay_company_enrich", inputs || {}, opts || {});
  }
};
