const { utils } = require("./utils");

module.exports = {
  async clickhouse_query_select(node, msg, inputs, opts) {
    return utils.run("clickhouse_query_select", inputs || {}, opts || {});
  }
};
