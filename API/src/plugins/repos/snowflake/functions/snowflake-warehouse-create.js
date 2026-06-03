const { utils } = require("./utils");

module.exports = {
  async snowflake_warehouse_create(node, msg, inputs, opts) {
    return utils.run("snowflake_warehouse_create", inputs || {}, opts || {});
  }
};
