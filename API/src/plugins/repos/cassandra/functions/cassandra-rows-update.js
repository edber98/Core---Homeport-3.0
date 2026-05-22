const { utils } = require("./utils");

module.exports = {
  async cassandra_rows_update(node, msg, inputs, opts) {
    return utils.run("cassandra_rows_update", inputs || {}, opts || {});
  }
};
