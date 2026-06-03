const { utils } = require("./utils");

module.exports = {
  async redis_hash_get(node, msg, inputs, opts) {
    return utils.run("redis_hash_get", inputs || {}, opts || {});
  }
};
