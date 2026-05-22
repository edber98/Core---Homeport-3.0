const { utils } = require("./utils");

module.exports = {
  async snowflake_table_get(node, msg, inputs, opts) {
    return utils.run("snowflake_table_get", inputs || {}, opts || {});
  }
};
