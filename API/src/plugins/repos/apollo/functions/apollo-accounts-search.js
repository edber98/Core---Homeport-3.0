const { utils } = require("./utils");

module.exports = {
  async apollo_accounts_search(node, msg, inputs, opts) {
    return utils.run("apollo_accounts_search", inputs || {}, opts || {});
  }
};
