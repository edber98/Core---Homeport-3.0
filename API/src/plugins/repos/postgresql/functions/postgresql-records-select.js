const { utils } = require("./utils");

module.exports = {
  async postgresql_records_select(node, msg, inputs, opts) {
    return utils.run("postgresql_records_select", inputs || {}, opts || {});
  }
};
