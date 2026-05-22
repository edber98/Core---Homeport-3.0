const { utils } = require("./utils");

module.exports = {
  async cassandra_tables_list(node, msg, inputs, opts) {
    return utils.run("cassandra_tables_list", inputs || {}, opts || {});
  }
};
