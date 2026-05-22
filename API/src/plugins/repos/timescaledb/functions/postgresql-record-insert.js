const { utils } = require("./utils");

module.exports = {
  async timescaledb_record_insert(node, msg, inputs, opts) {
    return utils.run("timescaledb_record_insert", inputs || {}, opts || {});
  }
};
