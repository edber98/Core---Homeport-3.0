const { utils } = require("./utils");

module.exports = {
  async snowflake_warehouse_list(node, msg, inputs, opts) {
    return utils.run("snowflake_warehouse_list", inputs || {}, opts || {});
  }
};
