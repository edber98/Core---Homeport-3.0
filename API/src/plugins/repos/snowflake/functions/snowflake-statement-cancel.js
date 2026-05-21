const { utils } = require("./utils");

module.exports = {
  async snowflake_statement_cancel(node, msg, inputs, opts) {
    return utils.run("snowflake_statement_cancel", inputs || {}, opts || {});
  }
};
