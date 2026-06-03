const { utils } = require("./utils");

module.exports = {
  async neon_tables_list(node, msg, inputs, opts) {
    return utils.run("neon_tables_list", inputs || {}, opts || {});
  }
};
