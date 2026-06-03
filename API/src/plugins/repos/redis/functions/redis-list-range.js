const { utils } = require("./utils");

module.exports = {
  async redis_list_range(node, msg, inputs, opts) {
    return utils.run("redis_list_range", inputs || {}, opts || {});
  }
};
