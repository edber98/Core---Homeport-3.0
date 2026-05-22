const { utils } = require("./utils");

module.exports = {
  async redis_hash_delete(node, msg, inputs, opts) {
    return utils.run("redis_hash_delete", inputs || {}, opts || {});
  }
};
