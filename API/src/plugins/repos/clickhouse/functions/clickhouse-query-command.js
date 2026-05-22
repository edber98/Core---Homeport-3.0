const { utils } = require("./utils");

module.exports = {
  async clickhouse_query_command(node, msg, inputs, opts) {
    return utils.run("clickhouse_query_command", inputs || {}, opts || {});
  }
};
