const { utils } = require("./utils");

module.exports = {
  async neon_record_upsert(node, msg, inputs, opts) {
    return utils.run("neon_record_upsert", inputs || {}, opts || {});
  }
};
