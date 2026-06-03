const { utils } = require("./utils");

module.exports = {
  async apollo_account_create(node, msg, inputs, opts) {
    return utils.run("apollo_account_create", inputs || {}, opts || {});
  }
};
