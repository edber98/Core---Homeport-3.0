const { utils } = require("./utils");

module.exports = {
  async cassandra_batch_execute(node, msg, inputs, opts) {
    return utils.run("cassandra_batch_execute", inputs || {}, opts || {});
  }
};
