const { utils } = require("./utils");

module.exports = {
  async timescaledb_table_describe(node, msg, inputs, opts) {
    return utils.run("timescaledb_table_describe", inputs || {}, opts || {});
  }
};
