const { utils } = require("./utils");

module.exports = {
  async snowflake_database_delete(node, msg, inputs, opts) {
    return utils.run("snowflake_database_delete", inputs || {}, opts || {});
  }
};
