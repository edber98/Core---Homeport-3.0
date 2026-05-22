const { utils } = require("./utils");

module.exports = {
  async redis_key_delete(node, msg, inputs, opts) {
    return utils.run("redis_key_delete", inputs || {}, opts || {});
  }
};
