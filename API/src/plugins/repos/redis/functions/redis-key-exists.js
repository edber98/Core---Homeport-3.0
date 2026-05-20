const { utils } = require("./utils");

module.exports = {
  async redis_key_exists(node, msg, inputs, opts) {
    return utils.run("redis_key_exists", inputs || {}, opts || {});
  }
};
