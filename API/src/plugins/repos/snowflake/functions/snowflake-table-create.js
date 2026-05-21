const { utils } = require("./utils");

module.exports = {
  async snowflake_table_create(node, msg, inputs, opts) {
    return utils.run("snowflake_table_create", inputs || {}, opts || {});
  }
};
