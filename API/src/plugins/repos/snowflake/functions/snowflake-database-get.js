const { utils } = require("./utils");

module.exports = {
  async snowflake_database_get(node, msg, inputs, opts) {
    return utils.run("snowflake_database_get", inputs || {}, opts || {});
  }
};
