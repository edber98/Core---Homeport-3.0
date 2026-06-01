const { utils } = require("./utils");

module.exports = {
  async clay_table_row_delete(node, msg, inputs, opts) {
    return utils.run("clay_table_row_delete", inputs || {}, opts || {});
  }
};
