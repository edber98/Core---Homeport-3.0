const { utils } = require("./utils");

module.exports = {
  async snowflake_schema_get(node, msg, inputs, opts) {
    return utils.run("snowflake_schema_get", inputs || {}, opts || {});
  }
};
