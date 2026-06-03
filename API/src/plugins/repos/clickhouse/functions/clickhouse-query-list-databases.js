const { utils } = require("./utils");

module.exports = {
  async clickhouse_query_list_databases(node, msg, inputs, opts) {
    return utils.run("clickhouse_query_list_databases", inputs || {}, opts || {});
  }
};
