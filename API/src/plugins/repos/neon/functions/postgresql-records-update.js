const { utils } = require("./utils");

module.exports = {
  async neon_records_update(node, msg, inputs, opts) {
    return utils.run("neon_records_update", inputs || {}, opts || {});
  }
};
