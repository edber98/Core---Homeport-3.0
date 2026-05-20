const { utils } = require("./utils");

module.exports = {
  async redis_key_expire(node, msg, inputs, opts) {
    return utils.run("redis_key_expire", inputs || {}, opts || {});
  }
};
