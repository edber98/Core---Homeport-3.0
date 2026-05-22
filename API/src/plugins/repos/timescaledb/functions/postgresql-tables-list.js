const { utils } = require("./utils");

module.exports = {
  async timescaledb_tables_list(node, msg, inputs, opts) {
    return utils.run("timescaledb_tables_list", inputs || {}, opts || {});
  }
};
