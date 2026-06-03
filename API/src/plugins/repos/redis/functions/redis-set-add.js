const { utils } = require("./utils");

module.exports = {
  async redis_set_add(node, msg, inputs, opts) {
    return utils.run("redis_set_add", inputs || {}, opts || {});
  }
};
