const { utils } = require("./utils");

module.exports = {
  async snowflake_statement_execute(node, msg, inputs, opts) {
    return utils.run("snowflake_statement_execute", inputs || {}, opts || {});
  }
};
