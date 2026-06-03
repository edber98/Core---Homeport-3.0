const { utils } = require("./utils");

module.exports = {
  async timescaledb_transaction_execute(node, msg, inputs, opts) {
    return utils.run("timescaledb_transaction_execute", inputs || {}, opts || {});
  }
};
