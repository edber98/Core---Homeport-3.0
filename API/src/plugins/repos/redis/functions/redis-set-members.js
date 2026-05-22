const { utils } = require("./utils");

module.exports = {
  async redis_set_members(node, msg, inputs, opts) {
    return utils.run("redis_set_members", inputs || {}, opts || {});
  }
};
