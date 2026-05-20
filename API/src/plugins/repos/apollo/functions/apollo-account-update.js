const { utils } = require("./utils");

module.exports = {
  async apollo_account_update(node, msg, inputs, opts) {
    return utils.run("apollo_account_update", inputs || {}, opts || {});
  }
};
