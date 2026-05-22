const { utils } = require("./utils");

module.exports = {
  async redis_hash_set(node, msg, inputs, opts) {
    return utils.run("redis_hash_set", inputs || {}, opts || {});
  }
};
