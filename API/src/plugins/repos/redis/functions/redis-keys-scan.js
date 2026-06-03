const { utils } = require("./utils");

module.exports = {
  async redis_keys_scan(node, msg, inputs, opts) {
    return utils.run("redis_keys_scan", inputs || {}, opts || {});
  }
};
