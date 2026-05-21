const { utils } = require("./utils");

module.exports = {
  async snowflake_warehouse_suspend(node, msg, inputs, opts) {
    return utils.run("snowflake_warehouse_suspend", inputs || {}, opts || {});
  }
};
