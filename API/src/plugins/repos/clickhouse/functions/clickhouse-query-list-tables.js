const { utils } = require("./utils");

module.exports = {
  async clickhouse_query_list_tables(node, msg, inputs, opts) {
    return utils.run("clickhouse_query_list_tables", inputs || {}, opts || {});
  }
};
