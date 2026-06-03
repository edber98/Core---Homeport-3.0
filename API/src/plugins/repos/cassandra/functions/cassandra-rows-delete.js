const { utils } = require("./utils");

module.exports = {
  async cassandra_rows_delete(node, msg, inputs, opts) {
    return utils.run("cassandra_rows_delete", inputs || {}, opts || {});
  }
};
