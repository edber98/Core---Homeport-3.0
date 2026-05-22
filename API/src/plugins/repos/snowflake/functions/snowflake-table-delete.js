const { utils } = require("./utils");

module.exports = {
  async snowflake_table_delete(node, msg, inputs, opts) {
    return utils.run("snowflake_table_delete", inputs || {}, opts || {});
  }
};
