const { utils } = require("./utils");

module.exports = {
  async qonto_bank_accounts_list(node, msg, inputs, opts) {
    return utils.run("qonto_bank_accounts_list", inputs || {}, opts || {});
  }
};
