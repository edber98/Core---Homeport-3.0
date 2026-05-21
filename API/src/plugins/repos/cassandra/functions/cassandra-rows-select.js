const { utils } = require("./utils");

module.exports = {
  async cassandra_rows_select(node, msg, inputs, opts) {
    return utils.run("cassandra_rows_select", inputs || {}, opts || {});
  }
};
