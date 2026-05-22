const { utils } = require("./utils");

module.exports = {
  async clickhouse_query_insert_json_each_row(node, msg, inputs, opts) {
    return utils.run("clickhouse_query_insert_json_each_row", inputs || {}, opts || {});
  }
};
