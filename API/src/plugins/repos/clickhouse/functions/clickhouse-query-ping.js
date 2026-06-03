const { utils } = require("./utils");

module.exports = {
  async clickhouse_query_ping(node, msg, inputs, opts) {
    return utils.run("clickhouse_query_ping", inputs || {}, opts || {});
  }
};
