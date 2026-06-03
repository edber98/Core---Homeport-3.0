const { utils } = require("./utils");

module.exports = {
  async redis_set_remove(node, msg, inputs, opts) {
    return utils.run("redis_set_remove", inputs || {}, opts || {});
  }
};
