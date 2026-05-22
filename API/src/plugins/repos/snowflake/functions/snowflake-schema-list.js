const { utils } = require("./utils");

module.exports = {
  async snowflake_schema_list(node, msg, inputs, opts) {
    return utils.run("snowflake_schema_list", inputs || {}, opts || {});
  }
};
