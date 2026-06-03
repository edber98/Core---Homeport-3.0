const { utils } = require("./utils");

module.exports = {
  async neon_transaction_execute(node, msg, inputs, opts) {
    return utils.run("neon_transaction_execute", inputs || {}, opts || {});
  }
};
