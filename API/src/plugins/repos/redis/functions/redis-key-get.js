const { utils } = require("./utils");

module.exports = {
  async redis_key_get(node, msg, inputs, opts) {
    return utils.run("redis_key_get", inputs || {}, opts || {});
  }
};
