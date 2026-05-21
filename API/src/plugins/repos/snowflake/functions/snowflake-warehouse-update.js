const { utils } = require("./utils");

module.exports = {
  async snowflake_warehouse_update(node, msg, inputs, opts) {
    return utils.run("snowflake_warehouse_update", inputs || {}, opts || {});
  }
};
