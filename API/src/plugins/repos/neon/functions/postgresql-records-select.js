const { utils } = require("./utils");

module.exports = {
  async neon_records_select(node, msg, inputs, opts) {
    return utils.run("neon_records_select", inputs || {}, opts || {});
  }
};
