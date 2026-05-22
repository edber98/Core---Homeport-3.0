const { utils } = require("./utils");

module.exports = {
  async qonto_transactions_list(node, msg, inputs, opts) {
    return utils.run("qonto_transactions_list", inputs || {}, opts || {});
  }
};
