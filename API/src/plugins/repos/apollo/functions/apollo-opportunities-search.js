const { utils } = require("./utils");

module.exports = {
  async apollo_opportunities_search(node, msg, inputs, opts) {
    return utils.run("apollo_opportunities_search", inputs || {}, opts || {});
  }
};
