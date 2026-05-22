const { utils } = require("./utils");

module.exports = {
  async redis_key_set(node, msg, inputs, opts) {
    return utils.run("redis_key_set", inputs || {}, opts || {});
  }
};
