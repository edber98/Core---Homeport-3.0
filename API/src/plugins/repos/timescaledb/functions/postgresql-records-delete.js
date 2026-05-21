const { utils } = require("./utils");

module.exports = {
  async timescaledb_records_delete(node, msg, inputs, opts) {
    return utils.run("timescaledb_records_delete", inputs || {}, opts || {});
  }
};
