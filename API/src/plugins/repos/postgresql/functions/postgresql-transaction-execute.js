const { utils } = require("./utils");

module.exports = {
  async postgresql_transaction_execute(node, msg, inputs, opts) {
    return utils.run("postgresql_transaction_execute", inputs || {}, opts || {});
  }
};
