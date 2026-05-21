const { utils } = require("./utils");

module.exports = {
  async snowflake_warehouse_get(node, msg, inputs, opts) {
    return utils.run("snowflake_warehouse_get", inputs || {}, opts || {});
  }
};
