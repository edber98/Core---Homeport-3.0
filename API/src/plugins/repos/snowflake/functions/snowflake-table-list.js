const { utils } = require("./utils");

module.exports = {
  async snowflake_table_list(node, msg, inputs, opts) {
    return utils.run("snowflake_table_list", inputs || {}, opts || {});
  }
};
