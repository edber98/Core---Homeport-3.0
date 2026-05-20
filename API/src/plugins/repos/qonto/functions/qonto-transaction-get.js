const { utils } = require("./utils");

module.exports = {
  async qonto_transaction_get(node, msg, inputs, opts) {
    return utils.run("qonto_transaction_get", inputs || {}, opts || {});
  }
};
