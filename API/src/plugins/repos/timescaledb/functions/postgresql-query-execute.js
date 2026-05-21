const { utils } = require("./utils");

module.exports = {
  async timescaledb_query_execute(node, msg, inputs, opts) {
    return utils.run("timescaledb_query_execute", inputs || {}, opts || {});
  }
};
