const { utils } = require("./utils");

module.exports = {
  async cassandra_table_describe(node, msg, inputs, opts) {
    return utils.run("cassandra_table_describe", inputs || {}, opts || {});
  }
};
