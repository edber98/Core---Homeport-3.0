const { utils } = require("./utils");

module.exports = {
  async snowflake_warehouse_delete(node, msg, inputs, opts) {
    return utils.run("snowflake_warehouse_delete", inputs || {}, opts || {});
  }
};
