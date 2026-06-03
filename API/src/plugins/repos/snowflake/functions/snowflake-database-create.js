const { utils } = require("./utils");

module.exports = {
  async snowflake_database_create(node, msg, inputs, opts) {
    return utils.run("snowflake_database_create", inputs || {}, opts || {});
  }
};
