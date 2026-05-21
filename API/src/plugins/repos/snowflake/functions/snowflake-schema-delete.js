const { utils } = require("./utils");

module.exports = {
  async snowflake_schema_delete(node, msg, inputs, opts) {
    return utils.run("snowflake_schema_delete", inputs || {}, opts || {});
  }
};
