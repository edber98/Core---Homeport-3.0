const { utils } = require("./utils");

module.exports = {
  async snowflake_schema_create(node, msg, inputs, opts) {
    return utils.run("snowflake_schema_create", inputs || {}, opts || {});
  }
};
