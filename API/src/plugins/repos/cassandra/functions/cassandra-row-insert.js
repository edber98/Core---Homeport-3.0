const { utils } = require("./utils");

module.exports = {
  async cassandra_row_insert(node, msg, inputs, opts) {
    return utils.run("cassandra_row_insert", inputs || {}, opts || {});
  }
};
