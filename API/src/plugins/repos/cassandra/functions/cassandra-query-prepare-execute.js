const { utils } = require("./utils");

module.exports = {
  async cassandra_query_prepare_execute(node, msg, inputs, opts) {
    return utils.run("cassandra_query_prepare_execute", inputs || {}, opts || {});
  }
};
