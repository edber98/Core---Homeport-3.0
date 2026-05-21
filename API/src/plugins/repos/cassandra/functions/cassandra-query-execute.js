const { utils } = require("./utils");

module.exports = {
  async cassandra_query_execute(node, msg, inputs, opts) {
    return utils.run("cassandra_query_execute", inputs || {}, opts || {});
  }
};
