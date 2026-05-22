const { utils } = require("./utils");

module.exports = {
  async postgresql_records_delete(node, msg, inputs, opts) {
    return utils.run("postgresql_records_delete", inputs || {}, opts || {});
  }
};
