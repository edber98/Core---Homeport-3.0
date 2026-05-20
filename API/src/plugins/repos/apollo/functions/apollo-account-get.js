const { utils } = require("./utils");

module.exports = {
  async apollo_account_get(node, msg, inputs, opts) {
    return utils.run("apollo_account_get", inputs || {}, opts || {});
  }
};
