const { utils } = require("./utils");

module.exports = {
  async apollo_organizations_enrich(node, msg, inputs, opts) {
    return utils.run("apollo_organizations_enrich", inputs || {}, opts || {});
  }
};
