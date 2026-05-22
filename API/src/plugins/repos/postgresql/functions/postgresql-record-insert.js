const { utils } = require("./utils");

module.exports = {
  async postgresql_record_insert(node, msg, inputs, opts) {
    return utils.run("postgresql_record_insert", inputs || {}, opts || {});
  }
};
