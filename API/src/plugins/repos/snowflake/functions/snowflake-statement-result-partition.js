const { utils } = require("./utils");

module.exports = {
  async snowflake_statement_result_partition(node, msg, inputs, opts) {
    return utils.run("snowflake_statement_result_partition", inputs || {}, opts || {});
  }
};
