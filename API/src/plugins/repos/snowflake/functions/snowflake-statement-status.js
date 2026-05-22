const { utils } = require("./utils");

module.exports = {
  async snowflake_statement_status(node, msg, inputs, opts) {
    return utils.run("snowflake_statement_status", inputs || {}, opts || {});
  }
};
