const { utils } = require("./utils");

module.exports = {
  async clay_table_row_create(node, msg, inputs, opts) {
    return utils.run("clay_table_row_create", inputs || {}, opts || {});
  }
};
