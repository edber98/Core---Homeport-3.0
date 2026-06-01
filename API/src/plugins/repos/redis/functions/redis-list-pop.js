const { utils } = require("./utils");

module.exports = {
  async redis_list_pop(node, msg, inputs, opts) {
    return utils.run("redis_list_pop", inputs || {}, opts || {});
  }
};
