const { utils } = require("./utils");

module.exports = {
  async snowflake_database_list(node, msg, inputs, opts) {
    return utils.run("snowflake_database_list", inputs || {}, opts || {});
  }
};
